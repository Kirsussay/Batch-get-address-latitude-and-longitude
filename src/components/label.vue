<template>
    <div style=""display:none/>
</template>

<script setup>
  import { watch } from 'vue'
  import { useLabel } from '../composables/label.js'
  
  //获取从mapview中创建的地图对象实例
  const props = defineProps({
    map: { type: Object, default: null }
  })

  const { labelMountToMap,addLabels,highlightLabel,clearLabel } = useLabel()

  // 地图实例变化时重新挂载标注图层（底图切换时也会触发）
  watch(() => props.map, (newMap) => {
    if (newMap) labelMountToMap(newMap)
  }, { immediate: true })

  defineExpose({ addLabels, highlightLabel,clearLabel })
  </script>