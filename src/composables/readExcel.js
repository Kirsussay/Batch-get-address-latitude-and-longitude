import { ref } from 'vue'
import * as XLSX from 'xlsx'

// 复用高德 Key（与 addressquery.js 保持一致）
const GAODE_KEY = '61158e4b00c738a7ce2f1d31b37ed78f'

export function useExcelReader() {
  const fileData = ref(null)          // { headers, rows, sheetName }
  const addressColumn = ref('')       // 当前选中的地址列名
  const loading = ref(false)
  const progress = ref(0)
  const geocodedData = ref([])        // 包含经纬度的完整数据

  // ---------- 读取 Excel ----------
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const json = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
          const headers = json.length > 0 ? Object.keys(json[0]) : []

          fileData.value = {
            headers,
            rows: json,
            sheetName: workbook.SheetNames[0]
          }

          // 自动检测地址列
          const detected = detectAddressColumn(headers)
          addressColumn.value = detected || ''
          resolve(fileData.value)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  // ---------- 自动检测地址列 ----------
  function detectAddressColumn(headers) {
    const lower = headers.map(h => h.toLowerCase())
    const keywords = ['地址', 'addr', 'address', '位置', 'location', '详细地址']
    for (const kw of keywords) {
      const idx = lower.findIndex(h => h.includes(kw))
      if (idx !== -1) return headers[idx]
    }
    return null
  }

  // ---------- 批量地理编码 ----------
  async function geocodeAddresses(addresses, key = GAODE_KEY) {
    const results = []
    const batchSize = 10   // 每批并发数
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize)
      const batchPromises = batch.map(async (addr) => {
        if (!addr || String(addr).trim() === '') {
          return { lng: null, lat: null, status: 'empty' }
        }
        try {
          const url = 'https://restapi.amap.com/v3/geocode/geo'
          const params = new URLSearchParams({
            key: key,
            address: String(addr).trim(),
            output: 'JSON'
          })
          const response = await fetch(`${url}?${params.toString()}`)
          const data = await response.json()
          if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
            const [lng, lat] = data.geocodes[0].location.split(',').map(Number)
            return { lng, lat, status: 'success' }
          } else {
            return { lng: null, lat: null, status: 'fail', info: data.info }
          }
        } catch (e) {
          return { lng: null, lat: null, status: 'error', info: e.message }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // 更新进度
      progress.value = Math.min(100, ((i + batchSize) / addresses.length) * 100)

      // 避免触发 QPS 限制，间隔 200ms
      if (i + batchSize < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    progress.value = 100
    return results
  }

  // ---------- 启动地理编码 ----------
  async function startGeocode() {
    if (!fileData.value || !addressColumn.value) {
      alert('请先上传文件并选择地址列')
      return
    }

    const rows = fileData.value.rows
    const col = addressColumn.value
    const addresses = rows.map(row => String(row[col] || ''))

    loading.value = true
    progress.value = 0

    try {
      const geocodeResults = await geocodeAddresses(addresses)

      // 将经纬度合并到原行
      const newRows = rows.map((row, index) => {
        const result = geocodeResults[index] || { lng: null, lat: null, status: 'unknown' }
        return {
          ...row,
          '经度': result.lng,
          '纬度': result.lat,
          '_geocodeStatus': result.status
        }
      })

      // 更新表头（若不存在则追加）
      let headers = [...fileData.value.headers]
      if (!headers.includes('经度')) headers.push('经度')
      if (!headers.includes('纬度')) headers.push('纬度')
      if (!headers.includes('_geocodeStatus')) headers.push('_geocodeStatus')

      geocodedData.value = newRows
      fileData.value.rows = newRows
      fileData.value.headers = headers

      return newRows
    } catch (e) {
      console.error('地理编码失败', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // ---------- 下载新 Excel ----------
  function downloadExcel(filename = 'geocoded_data.xlsx') {
    if (!geocodedData.value || geocodedData.value.length === 0) {
      alert('没有数据可下载')
      return
    }

    const headers = fileData.value.headers
    const dataToExport = geocodedData.value.map(row => {
      const obj = {}
      headers.forEach(h => {
        obj[h] = row[h] !== undefined ? row[h] : ''
      })
      return obj
    })

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }

  return {
    fileData,
    addressColumn,
    loading,
    progress,
    geocodedData,
    readFile,
    detectAddressColumn,
    startGeocode,
    downloadExcel
  }
}