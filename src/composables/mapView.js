import { Map, View } from 'ol'
import { Tile as TileLayer } from 'ol/layer'
import { XYZ, OSM } from 'ol/source'
import { fromLonLat } from 'ol/proj'
import 'ol/ol.css'
import { ref, watch, onMounted, onUnmounted } from 'vue'

// 销毁旧地图实例，释放资源
function destroyOldMap(oldMap) {
  if (!oldMap) return
  oldMap.setTarget(undefined)
  oldMap.dispose()
}

function bindZoom(map) {
  return map
}

// 天地图图层创建
export function createTianDiTuMap() {
  const TK = 'b88bfb160c81dab8d9d20aaa74846360'
  return bindZoom(new Map({
    target: 'map',
    layers: [
      new TileLayer({
        source: new XYZ({
          url: `https://t{0-7}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TK}`,
          crossOrigin: 'anonymous'
        })
      }),
      new TileLayer({
        source: new XYZ({
          url: `https://t{0-7}.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TK}`,
          crossOrigin: 'anonymous'
        })
      })
    ],
    view: new View({
      center: fromLonLat([114.265328, 30.604138]),
      zoom: 7,
      maxZoom: 18,
      minZoom: 2
    }),
    controls: []
  }))
}

// 高德图层创建（国内可访问）
export function createGaoDeMap() {
  return bindZoom(new Map({
    target: 'map',
    layers: [
      new TileLayer({
        source: new XYZ({
          url: 'https://wprd0{1-4}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7',
          crossOrigin: 'anonymous'
        })
      })
    ],
    view: new View({
      center: fromLonLat([114.265328, 30.604138]),
      projection: 'EPSG:3857',
      zoom: 7,
      maxZoom: 18,
      minZoom: 3
    }),
    controls: []
  }))
}

// OSM图层（国内大概率加载失败）
export function createOSMap() {
  return bindZoom(new Map({
    target: 'map',
    layers: [
      new TileLayer({
        source: new OSM({ crossOrigin: 'anonymous' })
      })
    ],
    view: new View({
      center: fromLonLat([114.265328, 30.604138]),
      projection: 'EPSG:3857',
      zoom: 7,
      maxZoom: 18,
      minZoom: 3
    }),
    controls: []
  }))
}

export function MapSwitch() {
  const map = ref(null) // 统一命名，不要带下划线
  const mapType = ref('GaoDe')
  let osmTimer = null

  // 组件销毁清除定时器+地图
  onUnmounted(() => {
    clearTimeout(osmTimer)
    destroyOldMap(map.value)
  })

  onMounted(() => {
    map.value = createGaoDeMap()
  })

  // 监听底图切换
  watch(mapType, (newType) => {
    clearTimeout(osmTimer)
    if (!map.value) return
    // 先销毁旧地图
    destroyOldMap(map.value)

    switch (newType) {
      case 'TianDiTu':
        map.value = createTianDiTuMap()
        break
      case 'GaoDe':
        map.value = createGaoDeMap()
        break
      case 'OSM':
        map.value = createOSMap()
        osmTimer = setTimeout(() => {
          console.warn('OSM国内网络加载受限，建议切换天地图/高德')
        }, 1000)
        break
    }
  })

  // 定位到指定经纬度
  function setMapCenter([lon, lat]) {
    if (!map.value) return
    const view = map.value.getView()
    view.setCenter(fromLonLat([Number(lon), Number(lat)]))
    view.setZoom(15)
  }

  // 对外暴露 map（原代码返回 _map，组件拿不到实例！）
  return { map, mapType, setMapCenter }
}