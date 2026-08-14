import { ref } from 'vue'
  import * as XLSX from 'xlsx'

  const GaoDeKey = '61158e4b00c738a7ce2f1d31b37ed78f'

  // 高德地理编码 API 并发限制，每次请求间隔（毫秒）
  const REQUEST_DELAY = 120

  