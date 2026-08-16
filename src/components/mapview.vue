<template>
    <div class="app-shell">
        <!-- 顶部导航栏 -->
        <header class="top-bar">
            <div class="brand">
                <span class="brand-icon">🗺️</span>
                <span class="brand-title">WebGIS</span>
            </div>
            <div class="top-bar-search">
                <slot name="search"></slot>
            </div>
            <div class="map-selector">
                <label class="selector-label">底图选择</label>
                <div class="select-wrapper">
                    <select class="map-select" v-model="mapType">
                        <!-- v-model的使用元素包括{input、select、textarea、checkbox、radio、components（自定义组件）}-->
                        <!-- 多个CheckBox对应一个model时，model的类型是一个数组，单个checkbox值默认是boolean类型
                                radio对应的值是input的value值
                                text 和textarea 默认对应的model是字符串
                                select单选对应字符串，多选对应也是数组}-->
                        <option value="GaoDe">🗺️ 高德地图</option>
                        <option value="TianDiTu">🌏 天地图</option>
                        <option value="OSM">🌐 OSM 地图</option>
                    </select>

                    <span class="select-arrow">▾</span>
                </div>
            </div>
        </header>

        <!-- 地图容器 -->
        <main id="container">
            <div id="map"></div>

            <!-- 左下角信息浮层 -->
            <div class="info-panel">
                <div class="info-row">
                    <span class="info-dot active"></span>
                    <span>{{ mapType === 'TianDiTu' ? '天地图' : mapType === 'GaoDe' ? '高德地图' : 'OSM 地图' }}</span>
                </div>
            </div>

        </main>
    </div>
</template>

<script setup>

import { ref, watch } from 'vue'
import { MapSwitch } from '../composables/mapView.js'
import { useLabel } from '../composables/label.js'


const { map, mapType, setMapCenter } = MapSwitch()
const { labelMountToMap, addLabels, highlightLabel, clearLabel } = useLabel()

// 地图实例创建/切换时，将标注图层挂载到新地图
watch(map, (newMap) => {
    if (newMap) labelMountToMap(newMap)
})

defineExpose({ setMapCenter, addLabels, highlightLabel, clearLabel })


</script>

<style scoped>
/* ========== 全局重置 ========== */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

.app-shell {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    background: #2d1020;
}

/* ========== 顶部导航栏 ========== */
.top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 24px;
    height: 56px;
    background: linear-gradient(135deg, #3d1a2e 0%, #2d1020 100%);
    border-bottom: 1px solid rgba(236, 72, 153, 0.15);
    z-index: 100;
    flex-shrink: 0;
}

.brand {
    display: flex;
    align-items: center;
    gap: 10px;
}

.brand-icon {
    font-size: 26px;
    filter: drop-shadow(0 0 6px rgba(236, 72, 153, 0.5));
}

.brand-title {
    font-size: 18px;
    font-weight: 700;
    color: #fce7f3;
    letter-spacing: 1px;
}

.top-bar-search {
    flex: 1;
    display: flex;
    justify-content: center;
    margin: 0 16px;
    min-width: 0;
}

/* 地图选择器 */
.map-selector {
    display: flex;
    align-items: center;
    gap: 12px;
}

.selector-label {
    font-size: 13px;
    color: #e8b4c8;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.select-wrapper {
    position: relative;
}

.map-select {
    appearance: none;
    -webkit-appearance: none;
    padding: 8px 36px 8px 14px;
    border: 1px solid rgba(236, 72, 153, 0.3);
    border-radius: 8px;
    background: rgba(61, 26, 46, 0.8);
    backdrop-filter: blur(10px);
    color: #fce7f3;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    outline: none;
    transition: all 0.25s ease;
}

.map-select:hover {
    border-color: #ec4899;
    background: rgba(61, 26, 46, 1);
    box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15);
}

.map-select:focus {
    border-color: #ec4899;
    box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.25);
}

.select-arrow {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #db2777;
    font-size: 12px;
    pointer-events: none;
    transition: color 0.25s;
}

.select-wrapper:hover .select-arrow {
    color: #f472b6;
}

/* ========== 地图容器 ========== */
#container {
    flex: 1;
    position: relative;
    overflow: hidden;
}

#map {
    width: 100%;
    height: 100%;
}

/* ========== 左下角信息面板 ========== */
.info-panel {
    position: absolute;
    bottom: 24px;
    left: 24px;
    background: rgba(45, 16, 32, 0.85);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(236, 72, 153, 0.15);
    border-radius: 12px;
    padding: 10px 16px;
    z-index: 50;
}

.info-row {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #fce7f3;
    font-size: 13px;
    font-weight: 500;
}

.info-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ec4899;
    box-shadow: 0 0 8px rgba(236, 72, 153, 0.6);
}

.info-dot.active {
    animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {

    0%,
    100% {
        box-shadow: 0 0 4px rgba(236, 72, 153, 0.4);
    }

    50% {
        box-shadow: 0 0 14px rgba(236, 72, 153, 0.9);
    }
}
</style>
