<template>
  <div>
    <el-upload
      class="upload-demo"
      ref="upload"
      accept=".xlsx, .xls"
      action=""
      :auto-upload="false"
      :show-file-list="false"
      :on-change="handle">
      <el-button type="primary" size="large" slot="trigger">上传文件</el-button>
    </el-upload>

    <el-button type="success" @click="submit">提交</el-button>
  </div>

</template>
<script setup>

</script>
<style scoped></style>