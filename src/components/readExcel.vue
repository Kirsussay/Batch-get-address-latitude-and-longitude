<template>
  <div>
    <el-upload
      class="upload-demo"
      ref="upload"
      accept=".xlsx, .xls, .csv"
      action=""
      :auto-upload="true"
      :show-file-list="true"
      :on-change="handle">
      <el-button type="primary" size="large" slot="trigger">上传文件</el-button>
    </el-upload>

    <el-button type="success" @click="submit">提交</el-button>
  </div>

</template>
<script setup>
  import { ref } from 'vue';
  import * as XLSX from 'xlsx'
  function handle(ev){
    console.log(ev)
  }
</script>
<style scoped>


</style>