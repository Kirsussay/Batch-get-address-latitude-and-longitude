<template>
    <div class="excel-reader">
      <!-- 上传区域 -->
      <div class="upload-area">
        <input
          type="file"
          accept=".xlsx,.xls"
          ref="fileInput"
          @change="handleFileUpload"
          style="display:none"
        />
        <button @click="$refs.fileInput.click()" class="btn-upload">
          📂 选择 Excel 文件
        </button>
        <span v-if="fileData" class="file-info">
          {{ fileData.sheetName }} · {{ fileData.rows.length }} 行
        </span>
      </div>
  
      <!-- 配置与执行 -->
      <div v-if="fileData" class="options">
        <label>地址列：</label>
        <select v-model="addressColumn" class="col-select">
          <option v-for="h in fileData.headers" :key="h" :value="h">{{ h }}</option>
        </select>
  
        <button
          @click="startGeocode"
          :disabled="loading"
          class="btn-geocode"
        >
          {{ loading ? '⏳ 处理中...' : '🚀 开始地理编码' }}
        </button>
  
        <div v-if="loading" class="progress-wrapper">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
          <span class="progress-text">{{ Math.round(progress) }}%</span>
        </div>
      </div>
  
      <!-- 结果预览 & 下载 -->
      <div v-if="geocodedData.length > 0" class="result-preview">
        <h4>✅ 已完成（前 5 行预览）</h4>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th v-for="h in fileData.headers" :key="h">{{ h }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in geocodedData.slice(0, 5)" :key="idx">
                <td v-for="h in fileData.headers" :key="h">{{ row[h] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <button @click="downloadExcel" class="btn-download">
          ⬇️ 下载新 Excel
        </button>
      </div>
    </div>
  </template>
  
  <script setup>
  import { useExcelReader } from '../composables/readExcel.js'
  
  const {
    fileData,
    addressColumn,
    loading,
    progress,
    geocodedData,
    readFile,
    startGeocode,
    downloadExcel
  } = useExcelReader()
  
  const fileInput = ref(null)   // 需从 vue 导入 ref
  
  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      await readFile(file)
    } catch (err) {
      alert('读取文件失败：' + err.message)
    }
  }
  </script>
  
  <style scoped>
  .excel-reader {
    position: absolute;
    bottom: 80px;
    right: 20px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(6px);
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    max-width: 420px;
    max-height: 70vh;
    overflow-y: auto;
    font-size: 14px;
    color: #222;
    border: 1px solid rgba(236, 72, 153, 0.15);
  }
  
  .upload-area {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  
  .btn-upload {
    background: #2678c6;
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: 0.2s;
  }
  .btn-upload:hover {
    background: #1a5f9e;
  }
  
  .file-info {
    font-size: 13px;
    color: #555;
  }
  
  .options {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  
  .col-select {
    padding: 6px 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: white;
    flex: 1;
    min-width: 100px;
  }
  
  .btn-geocode {
    background: #ec4899;
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: 0.2s;
    white-space: nowrap;
  }
  .btn-geocode:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .btn-geocode:hover:not(:disabled) {
    background: #db2777;
  }
  
  .progress-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    margin-top: 4px;
  }
  .progress-bar {
    flex: 1;
    height: 10px;
    background: #eee;
    border-radius: 5px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #2678c6, #ec4899);
    width: 0%;
    transition: width 0.3s;
  }
  .progress-text {
    font-size: 13px;
    min-width: 40px;
  }
  
  .result-preview {
    margin-top: 14px;
    border-top: 1px solid #eee;
    padding-top: 12px;
  }
  .result-preview h4 {
    margin: 0 0 8px 0;
    font-weight: 600;
    font-size: 14px;
  }
  
  .table-wrap {
    max-height: 200px;
    overflow: auto;
    border: 1px solid #ddd;
    border-radius: 6px;
    margin-bottom: 10px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 6px 8px;
    white-space: nowrap;
  }
  th {
    background: #f5f5f5;
    position: sticky;
    top: 0;
    z-index: 2;
  }
  
  .btn-download {
    background: #10b981;
    color: #fff;
    border: none;
    padding: 8px 18px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: 0.2s;
  }
  .btn-download:hover {
    background: #059669;
  }
  </style>