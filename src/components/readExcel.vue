<template>
    <div class="excel-reader">
      <!-- ========== 步骤1：选择文件 ========== -->
      <div class="step-card">
        <div class="step-title">步骤1：选择 Excel 文件</div>
        <div class="file-upload">
          <input
            ref="fileInputRef"
            type="file"
            accept=".xlsx,.xls,.csv"
            @change="onFileChange"
            style="display:none"
          />
          <el-button type="primary" @click="fileInputRef.click()" :loading="loading">
            <el-icon><FolderOpened /></el-icon>
            选择文件
          </el-button>
          <span class="file-name" v-if="fileName">{{ fileName }}</span>
        </div>
      </div>

      <!-- ========== 步骤2：选择Sheet(多sheet时显示) ========== -->
      <div class="step-card" v-if="sheets.length > 1">
        <div class="step-title">步骤2：选择工作表</div>
        <el-select v-model="currentSheet" @change="onSheetChange" placeholder="请选择Sheet">
          <el-option v-for="s in sheets" :key="s" :label="s" :value="s" />
        </el-select>
      </div>

      <!-- ========== 步骤3：选择地址列 ========== -->
      <div class="step-card" v-if="columns.length">
        <div class="step-title">步骤3：选择地址列</div>
        <div class="col-select-row">
          <el-select v-model="selectedAddressCol" placeholder="请选择包含地址的列" style="width: 280px">
            <el-option v-for="col in columns" :key="col" :label="col" :value="col" />
          </el-select>
          <el-button @click="autoDetect" type="success" plain>
            自动识别地址列
          </el-button>
        </div>
        <div class="auto-detect-hint" v-if="detectedCol">
          识别结果：<strong>{{ detectedCol }}</strong>
        </div>
      </div>

      <!-- ========== 步骤4：开始编码 ========== -->
      <div class="step-card" v-if="selectedAddressCol && rawData.length">
        <div class="step-title">步骤4：查询经纬度</div>
        <div class="info-row">
          <span>地址列：<strong>{{ selectedAddressCol }}</strong></span>
          <span>共 <strong>{{ rawData.length }}</strong> 条数据</span>
        </div>
        <el-button
          type="warning"
          @click="onStartGeocode"
          :loading="geocoding"
          :disabled="geocoding"
        >
          {{ geocoding ? '查询中...' : '开始查询经纬度' }}
        </el-button>

        <!-- 进度条 -->
        <div class="progress-wrap" v-if="geocoding || progress === 100">
          <el-progress :percentage="progress" :status="progress === 100 ? 'success' : ''" />
          <span class="progress-text">{{ progress }}%（{{ geocodedCount }} / {{ rawData.length }}）</span>
        </div>
      </div>

      <!-- ========== 步骤5：数据预览 & 导出 ========== -->
      <div class="step-card" v-if="resultData.length">
        <div class="step-title">步骤5：预览结果 & 导出</div>

        <el-tabs v-model="activeTab">
          <el-tab-pane label="数据预览" name="preview">
            <div class="table-wrap">
              <el-table :data="resultData.slice(0, 50)" border stripe max-height="400" size="small">
                <el-table-column
                  v-for="col in displayColumns"
                  :key="col"
                  :prop="col"
                  :label="col"
                  min-width="120"
                  show-overflow-tooltip
                />
              </el-table>
              <div class="table-count" v-if="resultData.length > 50">
                仅显示前 50 条，共 {{ resultData.length }} 条
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="统计" name="stats">
            <div class="stats">
              <div class="stat-item">
                <span class="stat-label">总记录数</span>
                <span class="stat-value">{{ resultData.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">成功编码</span>
                <span class="stat-value success">{{ successCount }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">编码失败</span>
                <span class="stat-value fail">{{ failCount }}</span>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>

        <!-- 导出按钮 -->
        <div class="export-row">
          <el-button type="primary" @click="onExportXLSX">
            <el-icon><Download /></el-icon>
            导出 Excel（选择保存位置）
          </el-button>
          <el-button type="success" @click="onExportCSV">
            <el-icon><Download /></el-icon>
            导出 CSV（选择保存位置）
          </el-button>
          <el-button @click="onExportQuick">快速下载 xlsx</el-button>
        </div>
      </div>
    </div>
  </template>

  <script setup>
  import { ref, computed, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { FolderOpened, Download } from '@element-plus/icons-vue'
  import { useExcelReader } from '../composables/readExcel.js'

  const {
    sheets, currentSheet, columns, rawData,
    selectedAddressCol, resultData, loading, geocoding, progress,
    readExcel, loadSheet, batchGeocode,
    exportExcel, exportCSV, exportWithPicker, autoDetectCol,
  } = useExcelReader()

  const fileInputRef = ref(null)
  const fileName = ref('')
  const detectedCol = ref('')
  const activeTab = ref('preview')

  // ---------- displayColumns：预览列（把新增的经纬度列也展示） ----------
  const displayColumns = computed(() => {
    if (!resultData.value.length) return []
    const keys = Object.keys(resultData.value[0])
    // 优先把原始列放前面，_ 开头的新增列放后面
    const orig = keys.filter(k => !k.startsWith('_'))
    const extra = keys.filter(k => k.startsWith('_'))
    return [...orig, ...extra]
  })

  const successCount = computed(() =>
    resultData.value.filter(r => r._lng !== '' && r._lng !== undefined).length
  )
  const failCount = computed(() =>
    resultData.value.length - successCount.value
  )

  // sheet 切换时保持双向绑定
  watch(currentSheet, (val) => {
    if (val && sheets.value.includes(val)) {
      loadSheet(val)
    }
  })

  // ---------- 事件处理 ----------
  function onFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    fileName.value = file.name
    readExcel(file).then(() => {
      ElMessage.success(`成功读取 ${file.name}`)
      detectedCol.value = autoDetectCol()
    }).catch(err => {
      ElMessage.error('读取文件失败: ' + err.message)
    })
  }

  function onSheetChange(name) {
    loadSheet(name)
  }

  function autoDetect() {
    detectedCol.value = autoDetectCol()
    if (detectedCol.value) {
      selectedAddressCol.value = detectedCol.value
      ElMessage.success('已自动识别地址列：' + detectedCol.value)
    } else {
      ElMessage.warning('未能自动识别地址列，请手动选择')
    }
  }

  async function onStartGeocode() {
    await batchGeocode()
    if (resultData.value.length) {
      ElMessage.success(`地理编码完成！成功 ${successCount.value} 条，失败 ${failCount.value} 条`)
      activeTab.value = 'preview'
    }
  }

  async function onExportXLSX() {
    try {
      const ok = await exportWithPicker('xlsx')
      if (ok) ElMessage.success('导出成功')
    } catch (e) {
      ElMessage.error('导出失败: ' + e.message)
    }
  }

  async function onExportCSV() {
    try {
      const ok = await exportWithPicker('csv')
      if (ok) ElMessage.success('导出成功')
    } catch (e) {
      ElMessage.error('导出失败: ' + e.message)
    }
  }

  function onExportQuick() {
    exportExcel()
    ElMessage.success('文件已开始下载')
  }
  </script>

  <style scoped>
  .excel-reader {
    max-width: 900px;
    margin: 0 auto;
    padding: 20px;
  }

  .step-card {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 16px;
    box-shadow: 0 1px 6px rgba(0,0,0,0.08);
  }

  .step-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 14px;
    color: #303133;
  }

  .file-upload {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .file-name {
    color: #606266;
  }

  .col-select-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .auto-detect-hint {
    margin-top: 8px;
    color: #67c23a;
    font-size: 13px;
  }

  .info-row {
    display: flex;
    gap: 24px;
    margin-bottom: 12px;
    color: #606266;
    font-size: 14px;
  }

  .progress-wrap {
    margin-top: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .progress-text {
    font-size: 13px;
    color: #909399;
    white-space: nowrap;
  }

  .table-wrap {
    margin-top: 8px;
  }

  .table-count {
    text-align: center;
    color: #909399;
    font-size: 13px;
    padding: 8px 0;
  }

  .stats {
    display: flex;
    gap: 32px;
    padding: 16px 0;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-label {
    font-size: 13px;
    color: #909399;
  }

  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: #303133;
  }

  .stat-value.success { color: #67c23a; }
  .stat-value.fail { color: #f56c6c; }

  .export-row {
    display: flex;
    gap: 12px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #ebeef5;
  }
  </style>