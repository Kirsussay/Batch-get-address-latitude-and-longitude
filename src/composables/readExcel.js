import { ref } from 'vue'
  import * as XLSX from 'xlsx'

  const GaoDeKey = '61158e4b00c738a7ce2f1d31b37ed78f'

  // 高德地理编码 API 并发限制，每次请求间隔（毫秒）
  const REQUEST_DELAY = 120

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  export function useExcelReader() {
    const workbook = ref(null)
    const sheets = ref([])
    const currentSheet = ref('')
    const columns = ref([])
    const rawData = ref([])              // 当前 sheet 的原始数据（数组）
    const selectedAddressCol = ref('')   // 用户选中的地址列名
    const resultData = ref([])           // 添加经纬度后的数据
    const loading = ref(false)           // 读取文件
    const geocoding = ref(false)         // 批量编码中
    const progress = ref(0)              // 编码进度 0-100
    const progressText = ref('')         // 进度文字

    // ---------- 自动检测地址列 ----------
    function autoDetectCol() {
      const keywords = ['地址', 'address', '位置', 'location', '所在地', '住址', '详细地址', 'addr', 'place', '地点']
      for (const col of columns.value) {
        const lower = col.trim().toLowerCase()
        for (const kw of keywords) {
          if (lower.includes(kw.toLowerCase())) {
            return col
          }
        }
      }
      return ''
    }

    // ---------- 读取 Excel 文件 ----------
    async function readExcel(file) {
      loading.value = true
      try {
        const buffer = await file.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        workbook.value = wb
        sheets.value = wb.SheetNames
        loadSheet(wb.SheetNames[0])
      } catch (e) {
        console.error('读取 Excel 失败:', e)
        throw e
      } finally {
        loading.value = false
      }
    }

    // ---------- 加载指定 sheet ----------
    function loadSheet(name) {
      if (!workbook.value) return
      currentSheet.value = name
      const ws = workbook.value.Sheets[name]
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' })
      rawData.value = json
      columns.value = json.length ? Object.keys(json[0]) : []
      selectedAddressCol.value = autoDetectCol()
      resultData.value = []
      progress.value = 0
    }

    // ---------- 单条地址 → 经纬度 ----------
    async function geocodeSingle(address) {
      const url = 'https://restapi.amap.com/v3/geocode/geo'
      const params = new URLSearchParams({
        key: GaoDeKey,
        address: String(address),
        output: 'JSON',
      })
      const res = await fetch(`${url}?${params.toString()}`)
      const json = await res.json()
      if (json.status === '1' && json.geocodes && json.geocodes.length > 0) {
        const [lng, lat] = json.geocodes[0].location.split(',').map(Number)
        return {
          lng,
          lat,
          formatted_address: json.geocodes[0].formatted_address,
          level: json.geocodes[0].level,
        }
      }
      return null
    }

    // ---------- 批量地理编码 ----------
    async function batchGeocode() {
      if (!selectedAddressCol.value || !rawData.value.length) return

      geocoding.value = true
      progress.value = 0
      const total = rawData.value.length
      const out = []

      for (let i = 0; i < total; i++) {
        const row = { ...rawData.value[i] }
        const addr = row[selectedAddressCol.value]

        if (addr && String(addr).trim()) {
          try {
            const geo = await geocodeSingle(String(addr).trim())
            row._lng = geo ? geo.lng : ''
            row._lat = geo ? geo.lat : ''
            row._formatted_address = geo ? geo.formatted_address : ''
            row._geo_level = geo ? geo.level : ''
          } catch (e) {
            console.error(`编码失败 [${addr}]:`, e)
            row._lng = ''
            row._lat = ''
            row._formatted_address = ''
            row._geo_level = ''
          }
        } else {
          row._lng = ''
          row._lat = ''
          row._formatted_address = ''
          row._geo_level = ''
        }

        out.push(row)
        progress.value = Math.round(((i + 1) / total) * 100)

        // 控制请求频率，避免触发高德 QPS 限制
        if (i < total - 1) {
          await sleep(REQUEST_DELAY)
        }
      }

      resultData.value = out
      geocoding.value = false
    }

    // ---------- 导出 Excel（触发浏览器下载） ----------
    function exportExcel(filename = 'geocoded_result.xlsx') {
      const data = resultData.value.length ? resultData.value : rawData.value
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, currentSheet.value || 'Sheet1')
      XLSX.writeFile(wb, filename)
    }

    // ---------- 导出 CSV ----------
    function exportCSV(filename = 'geocoded_result.csv') {
      const data = resultData.value.length ? resultData.value : rawData.value
      const ws = XLSX.utils.json_to_sheet(data)
      const csv = XLSX.utils.sheet_to_csv(ws)
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    }

    // ---------- 通过 File System Access API 让用户选择保存路径 ----------
    async function exportWithPicker(format = 'xlsx') {
      const data = resultData.value.length ? resultData.value : rawData.value
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, currentSheet.value || 'Sheet1')

      let blob, suggestedName, mimeType
      if (format === 'csv') {
        const csv = XLSX.utils.sheet_to_csv(ws)
        blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
        suggestedName = 'geocoded_result.csv'
        mimeType = 'text/csv'
      } else {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        suggestedName = 'geocoded_result.xlsx'
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }

      // 尝试使用现代浏览器的文件选择器
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName,
            types: [{
              description: format === 'csv' ? 'CSV File' : 'Excel File',
              accept: { [mimeType]: [format === 'csv' ? '.csv' : '.xlsx'] },
            }],
          })
          const writable = await handle.createWritable()
          await writable.write(blob)
          await writable.close()
          return true
        } catch (e) {
          // 用户取消
          if (e.name === 'AbortError') return false
          throw e
        }
      } else {
        // 降级为普通下载
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = suggestedName
        a.click()
        URL.revokeObjectURL(url)
        return true
      }
    }

    return {
      workbook, sheets, currentSheet, columns,
      rawData, selectedAddressCol, resultData,
      loading, geocoding, progress, progressText,
      readExcel, loadSheet, batchGeocode,
      exportExcel, exportCSV, exportWithPicker,
      autoDetectCol,
    }
  }