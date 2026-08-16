<template>
  <div class="address-query" ref="queryRef">
    <div class="search-box">
      <input v-model="keyword" type="text" placeholder="请输入地址关键词搜索..." @input="onInput" @keydown.enter="onSearch" />
      <button @click="onSearch" :disabled="loading">搜索</button>
      <!-- <div style="color: blueviolet;"> keywords:{{ keyword }} </div> -->
    </div>



    <div v-if="loading" class="tip">查询中...</div>

    <ul v-if="!collapsed && geoData.tips && geoData.tips.length" class="suggest-list">
      <li v-for="item in geoData.tips" :key="item.id" @click="onSelect(item)">
        <span class="name">{{ item.name }}</span>
        <span class="address">{{ item.address }}</span>
        <span class="district">{{ item.district }}</span>
      </li>
    </ul>
    <div v-if="collapsed && geoData.tips && geoData.tips.length" class="expand-toggle" @click.stop="collapsed = false">
      <span>展开建议列表 ({{ geoData.tips.length }}条)</span>
      <span class="arrow">▼</span>
    </div>

    <div v-if="!loading && keyword && geoData.tips && !geoData.tips.length" class="tip">
      未找到相关地址
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
// 引入并执行工厂函数
import { useGeoSearch } from '../composables/addressquery.js'
const geoApi = useGeoSearch() // 实例化

const keyword = ref('')
const geoData = ref({ tips: [] })
const loading = ref(false)

const collapsed = ref(false)

let timer = null

function onInput() {
  collapsed.value = false
  clearTimeout(timer)
  timer = setTimeout(() => {
    doSearch()
  }, 400)
}
async function onSearch() {
  collapsed.value = false
  clearTimeout(timer)
  await doSearch()
}
async function doSearch() {
  const val = keyword.value.trim()
  if (!val) {
    geoData.value = { tips: [] }
    return
  }
  loading.value = true
  try {
    // 调用组合式内部search方法
    await geoApi.search(val)
    console.log('suggestions after search:', geoApi.suggestions.value)
    // 将接口建议赋值给geoData，匹配模板geoData.tips
    geoData.value = { tips: geoApi.suggestions.value }
    console.log('geoData after assign:', geoData.value)
    emit('suggestions', geoApi.suggestions.value)
  } catch (e) {
    console.error('搜索执行异常', e)
    geoData.value = { tips: [] }
  } finally {
    loading.value = false
  }
}
const emit = defineEmits(['select', 'suggestions'])
function onSelect(item) {
  // collapsed.value = true
  emit('select', item)
}
const queryRef = ref(null)
function handleClickOutside(e) {
  if (queryRef.value && !queryRef.value.contains(e.target)) {
    collapsed.value = true
  }
}
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.address-query {
  position: relative;
  z-index: 200;
  width: 360px;
  font-size: 14px;
}

.search-box {
  display: flex;
  gap: 6px;
}

.search-box input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  outline: none;
  font-size: 14px;
}

.search-box input:focus {
  border-color: #2678c6;
  box-shadow: 0 0 0 2px rgba(38, 120, 198, 0.2);
}

.search-box button {
  padding: 8px 16px;
  background: #2678c6;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.search-box button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tip {
  margin-top: 8px;
  padding: 10px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  text-align: center;
  color: #999;
}

.suggest-list {
  margin-top: 6px;
  padding: 0;
  list-style: none;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  max-height: 300px;
  overflow-y: auto;
}

.suggest-list li {
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.suggest-list li:last-child {
  border-bottom: none;
}

.suggest-list li:hover {
  background: #f0f6ff;
}

.suggest-list .name {
  font-weight: 600;
  color: #333;
}

.suggest-list .address {
  font-size: 12px;
  color: #666;
}

.suggest-list .district {
  font-size: 12px;
  color: #999;
}

.expand-toggle {
  margin-top: 6px;
  padding: 10px 12px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #2678c6;
  font-size: 13px;
  transition: background 0.2s;
}

.expand-toggle:hover {
  background: #f0f6ff;
}

.expand-toggle .arrow {
  font-size: 10px;
  transition: transform 0.2s;
}
</style>
