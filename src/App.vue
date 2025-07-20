<template>
    <el-container style="height: 100%; width: 100%">
        <el-header>
          <el-form v-model="status" inline>
              <el-form-item label="用户ID">
                  <el-input v-model="status.user" placeholder="请输入用户ID"></el-input>
              </el-form-item>
              <el-form-item label="训练">
                  <el-input v-model="status.trainid" placeholder="选择训练" style="width: 200px"></el-input>
              </el-form-item>
              <el-form-item label="训练课程">
                  <el-select v-model="status.courseid" placeholder="选择训练课程" style="width: 200px">
                      <el-option v-for="info in status.courses" :key="info.id" :label="info.name" :value="info.id"></el-option>
                  </el-select>
              </el-form-item>
              <el-form-item>
                <el-button @click="status.openintro = true">使用指南</el-button>
              </el-form-item>
          </el-form>
        </el-header>
        <el-main>
          <h2>{{ status.traintitle }}</h2>
          <el-table :data="status.result" style="width: 100%">
              <el-table-column prop="name" label="名称"></el-table-column>
              <el-table-column prop="time" label="学习时间 (秒)"></el-table-column>
              <el-table-column prop="processed" label="操作">
                  <template #default="scope">
                      <el-button v-if="!scope.row.processed" :disabled="!status.user" @click="process(scope.$index)" type="primary">
                          处理
                      </el-button>
                      <span v-else>已处理</span>
                  </template>
              </el-table-column>
          </el-table>
          
          <el-drawer
              v-model="status.openintro"
              title="使用指南"
              :before-close="() => status.openintro = false"
              direction="rtl"
              size="70%">
              <p> 第一步，进入自己的专题培训页面，点击自己要进行的专题培训。</p>
              <img src="./assets/step1.jpg" alt="使用指南" style="width: 100%; height: auto; border-radius: 8px;">
              <br/>
              <p> 第二步，随意选择一个培训课题。</p>
              <img src="./assets/step2.jpg" alt="使用指南" style="width: 100%; height: auto; border-radius: 8px;">
              <br/>
              <p> 第三步，点击左上角框起来的链接。</p>
              <img src="./assets/step3.jpg" alt="使用指南" style="width: 100%; height: auto; border-radius: 8px;">
              <br/>
              <p>第四步，将红框括起来的部分复制下来。</p>
              <img src="./assets/step4.jpg" alt="使用指南" style="width: 100%; height: auto; border-radius: 8px;">
              <br/>
              <p>第五步，将复制的内容黏贴进框起来的训练输入框，之后可以在右侧训练课程中找到要各个专题，选择专题。</p>
              <img src="./assets/step5.jpg" alt="使用指南" style="width: 100%; height: auto; border-radius: 8px;">
              <br/>
              <p>第六步，随便看一个专题视频，在视频的右上角或者左上角会出现自己的姓名和一组数字，将数字记录下来，复制到用户ID输入框里面。</p>
              <br/>
              <p>第七步，点击处理按钮，如果成功的话，回去看视频，视频进度只剩5秒就可以看完。</p>
          </el-drawer>
        </el-main>
        <el-footer>
          <pre>{{ status.display }}</pre>
        </el-footer>
    </el-container>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import axios from 'axios'

const status = reactive<{
    user: string,
    trainid: string,
    traintitle: string,
    courseid: string,
    display: string,
    courses: { id: string, name: string, setid: string }[],
    result: { name: string, resource: string, time: number, processed: boolean }[],
    openintro: boolean
}>({
    user: "",
    trainid: "10f7b3d6-e1c6-4a2e-ba76-e2f2af4674a5",
    traintitle: "",
    courseid: "",
    display: "",
    courses: [],
    result: [],
    openintro: false
})

watch(() => status.trainid, async() => {
  if (!status.trainid) return

  const response = await axios.get(`https://s-file-1.ykt.cbern.com.cn/teach/api_static/trains/${status.trainid}.json`)
  status.traintitle = response.data.train.title

  const course_ids = response.data.train_course_ids
  const courses = []
  for(let i = 0; i < course_ids.length; i++)
  {
    let response = await axios.get(`https://s-file-1.ykt.cbern.com.cn/teach/s_course/v2/business_courses/${course_ids[i]}/course_relative_infos/zh-CN.json`)

    courses.push({
      id: course_ids[i],
      name: response.data.course_detail.name,
      setid: response.data.course_detail.activity_set_id
    })
  }
  status.courses = courses
}, { immediate: true })

watch(() => status.courseid, async() => {
    if (!status.courseid) 
    {
        status.display = ""
        status.result = []
    }
    try {
        const activeSetId = status.courses.find(c => c.id === status.courseid)?.setid
        const response = await axios.get(`https://s-file-1.ykt.cbern.com.cn/teach/s_course/v2/activity_sets/${activeSetId}/fulls.json`)
        status.result = buildResult("", response.data.nodes)
        status.display = `Loaded ${status.result.length} resources for course ID: ${status.courseid}\n`
    } catch (error) {
        status.display += `Course ID: ${status.courseid}, Error: ${error}\n`
    }
})

const process = async(index: number) => {
    const row = status.result[index]
    const replace = [ ... status.result ]
    replace[index] = { ...row, processed: true }
    status.result = replace

    console.log(`Processing resource: ${row.resource} for user: ${status.user}`)
    try {
        row.processed = true

        await axios.put(`https://x-study-record-api.ykt.eduyun.cn/v1/resource_learning_positions/${row.resource}/${status.user}`, {
            position: 1,
        })
        await new Promise(resolve => setTimeout(resolve, 1000)) // 延时1秒
        
        await axios.put(`https://x-study-record-api.ykt.eduyun.cn/v1/resource_learning_positions/${row.resource}/${status.user}`, {
            position: row.time - 3,
        })

        status.display += `Processed resource ${row.resource} for user ${status.user}\n`
    } catch (error) {
        status.display += `Error processing resource ${row.resource}: ${error}\n`
    }
}

const buildResult = (prev: string, data: any[]): any[] => {
    const result = []
    for(let i = 0; i < data.length; i++)
    {
        const node = data[i]
        if (node.node_type === "catalog")
        {
            result.push(...buildResult(`${prev}${node.node_name}/`, node.child_nodes as any))
        }
        else if(node.node_type === "activity")
        {
            const activity = node.relations?.activity
            if (!activity || !activity.activity_resources?.length) continue
            const video = activity.activity_resources?.find((a: any) => a.resource_type === "video")
            if (!video) continue
            result.push({
                name: `${prev}${node.node_name}`,
                resource: video.resource_id,
                time: video.study_time,
                processed: false
            })
        }
    }
    return result
}

</script>