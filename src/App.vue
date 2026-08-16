<template>
  <ReadExcel />
  
  <Mapview ref="mapRef">
    <template #search>
      <AddressQuery @select="handleAddressSelect" @suggestions="handleSuggestions" />
    </template>
  </Mapview>
 
  <div class="footer-text">该搜索服务由高德地图服务</div>

</template>


<script setup>
import { ref } from 'vue';
import Mapview from './components/mapview.vue';
import AddressQuery from './components/addressquery.vue';
 import ReadExcel from './components/readExcel.vue'

const mapRef = ref(null);

function handleSuggestions(tips) {
  mapRef.value.addLabels(tips);
}

function handleAddressSelect(item) {
  mapRef.value.highlightLabel(item.id);

  // 1. 检查 location 是否存在且为字符串
  const location = item.location;
  if (typeof location !== 'string' || !location.includes(',')) {
    alert('该项无经纬度信息或格式无效');
    return;
  }

  // 2. 分割并转为数字
  const parts = location.split(',').map(Number);
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    alert('经纬度格式异常');
    return;
  }

  const [lon, lat] = parts;
  console.log('选中地址的经纬度:', lon, lat);

  // 3. 定位地图
  mapRef.value?.setMapCenter([lon, lat]);
}
</script>


<style>
  .app-root {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.footer-text {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  background: rgba(0, 0, 0, 0.6);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  z-index: 1000;
  pointer-events: none;
  white-space: nowrap;
  backdrop-filter: blur(4px);
}
</style>