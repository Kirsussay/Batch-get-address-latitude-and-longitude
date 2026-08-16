<template>
  <div class="read-excel">
    <el-upload class="upload-demo" ref="upload" accept=".xlsx, .xls" action="" :auto-upload="false"
      :show-file-list="true" :on-change="handle">
      <el-button type="primary" size="large" slot="trigger">上传文件</el-button>
    </el-upload>

    <el-button type="success" @click="submit">提交</el-button>
    <el-button type="warning" :disabled="!lonLatData.length" @click="exportXlsxFile">导出</el-button>
    <div class="progress-wrap" v-if="progressNum > 0">
      <el-progress :percentage="progressPercentage" :format="() => `${progressDone}/${progressNum}`" :stroke-width="14">
      </el-progress>
    </div>
  </div>


  <el-dialog v-model="dialogVisible" title="请选择地址列" width="420px">
    <el-radio-group v-model="selectAddressColumnIndex">
      <el-radio v-for="(title, index) in headers" :key="index" :value="index"
        style="display: block;margin-bottom: 10px;">{{ title }}
      </el-radio>
    </el-radio-group>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmAddressColumn">确定</el-button>
    </template>
  </el-dialog>



</template>
<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue';
import * as XLSX from 'xlsx'
import { autoResizerProps, ElMessage } from 'element-plus'
import { GAODE_KEY } from '../config.js'

const upload = ref(null)
const fileContext = ref(null)
const excelData = ref([])
const addressData = ref([])
const dialogVisible = ref(false)
const headers = ref([])
const selectAddressColumnIndex = ref(null)
const lonLatData = ref([])
const loading = ref(false)
const progressNum = ref(0)
const progressDone = ref(0)
const progressPercentage = computed(() => {
  return progressNum.value === 0 ? 0 : Math.round((progressDone.value / progressNum.value) * 100)
})

let abortController = null

onUnmounted(() => {
  abortController?.abort()
})

// 重置所有派生数据，防止跨提交累积脏数据
function resetData() {
  excelData.value = []
  addressData.value = []
  lonLatData.value = []
  headers.value = []
  selectAddressColumnIndex.value = null
  progressNum.value = 0
  progressDone.value = 0
}

function handle(uploadFile) {
  const file = uploadFile.raw
  console.log(file)
  //slice(提取字符串中某个部分);lastIndexOf()某个字符最后一次出现的位置
  const extensionName = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()

  if (['.xlsx', '.xls'].includes(extensionName)) {
    console.log(extensionName)
  }
  else {
    ElMessage.error('请上传Excel文件')
    upload.value?.clearFiles()
    // uploadFile.status = 'fail'
    return
  }

  if (file.size === 0) {
    ElMessage.error('文件为空')
    upload.value?.clearFiles()
    return false

  }
  fileContext.value = file
  resetData()
  ElMessage.success(`文件上传成功:${file.name}`)

}


async function submit() {
  if (loading.value) {
    ElMessage.warning('正在处理中，请稍候')
    return
  }

  if (!fileContext.value) {
    ElMessage.error('请先上传文件')
    return
  }
  loading.value = true
  resetData()
  abortController = new AbortController()
  try {
    await readFile()
    const detected = autoDetectAddressColumn()
    if (detected) {
      await getLonLatData()
    }
  } finally {
    loading.value = false
  }
}

function readFile() {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })

      excelData.value = rows
      console.log('Excel数据:', excelData.value)
      resolve(rows)
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(fileContext.value)

  })
}


const ADDRESS_KEYWORDS = ['地址', 'address', '位置', '地点', '所在', '详细地址', '区域']

function autoDetectAddressColumn() {
  if (!excelData.value || excelData.value.length === 0) {
    ElMessage.error('Excel数据为空')
    return false
  }

  const headerRow = excelData.value[0]
  console.log('Header Row:', headerRow)
  let addressIndex = -1
  //entries()方法返回一个新的Array Iterator对象，该对象包含数组中的索引和对应的值
  //var fruits = ["Banana", "Orange", "Apple", "Mango"];=>[0, "Banana"][1, "Orange"][2, "Apple"][3, "Mango"]
  for (const [index, item] of headerRow.entries()) {
    if (ADDRESS_KEYWORDS.includes(item)) {
      ElMessage.success(`检测到地址列:${item},索引为${index}`)
      //slice(1)去掉表头，map(row => row[index])遍历上面的每一行（row），取出每一行中下标为 index（即 1）的那个元素，组成新数组。
      addressData.value = excelData.value.slice(1).map(row => row[index])
      console.log('地址数据:', addressData.value)
      addressIndex = index

    }
  }
  console.log('地址列索引:', addressIndex)

  if (addressIndex === -1) {
    headers.value = excelData.value[0]      // 把标题行放进弹窗
    selectAddressColumnIndex.value = null        // 重置选择
    dialogVisible.value = true              // 打开弹窗
    ElMessage.warning('未检测到地址列，请手动选择')
    return false
  }
  return true
}

function selectAddressColumn(index) {
  addressData.value = excelData.value.slice(1).map(row => row[index])
  console.log('手动选择地址列索引:', index)
  console.log('地址数据:', addressData.value)
  ElMessage.success(`已获取地址列：${excelData.value[0][index]}`)
  return true
}

async function confirmAddressColumn() {
  if (selectAddressColumnIndex.value === null) {
    ElMessage.error('请先选择地址列')
    return
  }
  selectAddressColumn(selectAddressColumnIndex.value)
  dialogVisible.value = false

  loading.value = true
  try {
    await getLonLatData()
  } finally {
    loading.value = false
  }
}



async function getLonLatData() {

  if (addressData.value.length === 0) {
    ElMessage.error('地址数据为空')
    return
  }

  progressNum.value = addressData.value.length
  progressDone.value = 0
  for (let i = 0; i < addressData.value.length; i++) {
    const address = addressData.value[i]
    try {
      if (!address) {
        lonLatData.value.push({ address, lon: null, lat: null })
        continue
      }
      const params = new URLSearchParams({
        key: GAODE_KEY,
        address: address
      }).toString()

      const url = `https://restapi.amap.com/v3/geocode/geo?${params}`

      const res = await fetch(url)
      const data = await res.json()
      console.log(`地址: ${address}, 响应数据:`, data)
      if (data.status === '1' && data.geocodes.length > 0) {
        const location = data.geocodes[0].location
        const [lon, lat] = location.split(',').map(Number)
        lonLatData.value.push({ address, lon, lat })
      }
      else {
        lonLatData.value.push({ address, lon: null, lat: null })
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('请求被中止')
        return
      }
      console.error('获取经纬度失败:', e)
      lonLatData.value.push({ address, lon: null, lat: null })
    } finally {
      progressDone.value++
      await new Promise(r => setTimeout(r, 350))
    }

  }
  console.log('经纬度数据:', lonLatData.value)
}

function exportXlsxFile() {
  if (!excelData.value.length) {
    ElMessage.error('没有可导出的数据')
    return
  }
  if (!lonLatData.value.length) {
    ElMessage.warning('请先完成经纬度查询')
    return
  }
  const rows = excelData.value.map(row => [...row])
  rows[0] = rows[0] || []
  rows[0].push('经度', '纬度')

  for (let i = 1; i < rows.length; i++) {
    const item = lonLatData.value[i - 1]
    rows[i] = rows[i] || []
    rows[i].push(item ? item.lon : null, item ? item.lat : null)
  }
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

  const baseName = fileContext.value?.name?.replace(/\.(xlsx|xls)$/i, '') || '地址'
  XLSX.writeFile(wb, `${baseName}+经纬度.xlsx`)

}


</script>




<style scoped>
.read-excel {
  position: absolute;
  left: 12px;
  top: 68px;
  width: 180px;
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

.read-excel :deep(.el-button) {
  width: 100%;
}

.progress-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.12);
  z-index: 300;
}
</style>