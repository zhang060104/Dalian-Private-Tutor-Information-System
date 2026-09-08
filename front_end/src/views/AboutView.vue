<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Medal, UserFilled, ChatDotRound, Check, ArrowRight } from '@element-plus/icons-vue'
import { CENTER_CONTACT } from '@/types'

const router = useRouter()

const VALUES = [
  { title: '口碑为本', desc: '不搞低价引流，不靠话术推销，用效果和口碑说话，大部分新家长来自老家长转介绍。' },
  { title: '效果可视', desc: '入学建档、阶段测评、定期反馈，每次辅导都有记录，进步看得见。' },
  { title: '长期陪伴', desc: '从小学到高中，学习规划一路有人跟进，长期陪伴孩子成长。' },
]

const PROCESS = [
  '扫码入驻 → 完善资料',
  '双向选择 & 简历投递',
  '缴纳定金 & 确认订单',
  '试课通过 → 正式授课',
]

const NUMBERS = [
  { num: '本地', label: '扎根大连本地服务' },
  { num: '双向', label: '老师学生双向选择' },
  { num: '真实', label: '资料与信用分实名展示' },
  { num: '透明', label: '入驻信息中心可查' },
]
</script>

<template>
  <div class="about">
    <!-- 页头 -->
    <div class="page-hero">
      <div class="container">
        <h1 class="page-title">关于大连私人家教中心</h1>
        <p class="page-sub">扎根大连，专注一对一 / 小班家教服务多年，服务数千个家庭。</p>
      </div>
    </div>

    <!-- 数字 -->
    <section class="section section--subtle nums-section">
      <div class="container num-grid">
        <div v-for="n in NUMBERS" :key="n.label" class="num-item">
          <div class="num-value">{{ n.num }}</div>
          <div class="num-label">{{ n.label }}</div>
        </div>
      </div>
    </section>

    <!-- 中心介绍 -->
    <section class="section">
      <div class="container about-intro">
        <div class="intro-copy">
          <div class="section-eyebrow">ABOUT US</div>
          <h2 class="intro-title">关于我们</h2>
          <p>
            大连私人家教中心是扎根大连本地的专业家教服务机构。我们深知，给孩子找家教
            最怕三件事：老师不靠谱、效果看不见、退费扯皮。
          </p>
          <p>
            因此我们从源头抓起——每位教员必须通过学历核验、教学经验背调与现场试讲三重审核，
            通过率不足 20%；同时坚持「师生双向选择、双方定金保障、试课满意再开课」，把主动权交给家长和老师。
          </p>
          <p>
            我们相信教育是慢功夫，不追求短期刷分，更看重学习习惯与方法的养成。
            无论查缺补漏、培优拔高还是升学冲刺，都值得一位真正适合孩子的好老师。
          </p>
        </div>
        <div class="intro-card">
          <div class="card-icon"><el-icon :size="30"><Medal /></el-icon></div>
          <div class="card-title">服务承诺</div>
          <ul class="promise-list">
            <li><el-icon color="#16a34a"><Check /></el-icon>师资三审，不合格不上岗</li>
            <li><el-icon color="#16a34a"><Check /></el-icon>师生双向选择，互选才匹配</li>
            <li><el-icon color="#16a34a"><Check /></el-icon>双方定金保障，防止逃单</li>
            <li><el-icon color="#16a34a"><Check /></el-icon>试课满意再开课，未通过退一半</li>
            <li><el-icon color="#16a34a"><Check /></el-icon>授课结束退全额押金</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 理念 -->
    <section class="section section--subtle">
      <div class="container">
        <div class="section-head">
          <div class="section-eyebrow">OUR VALUES</div>
          <h2 class="section-title">我们的坚持</h2>
        </div>
        <div class="value-grid">
          <div v-for="v in VALUES" :key="v.title" class="value-card">
            <div class="value-title">{{ v.title }}</div>
            <p class="value-desc">{{ v.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 服务流程 + 联系 -->
    <section class="section">
      <div class="container about-flow">
        <div class="flow-box">
          <div class="section-eyebrow">HOW WE SERVE</div>
          <h2 class="intro-title">服务流程</h2>
          <div class="flow-list">
            <div v-for="(p, i) in PROCESS" :key="i" class="flow-item">
              <span class="flow-index">{{ i + 1 }}</span>
              <span>{{ p }}</span>
            </div>
          </div>
          <el-button type="primary" round size="large" @click="router.push('/register')">
            立即入驻
            <el-icon class="btn-icon"><ArrowRight /></el-icon>
          </el-button>
        </div>

        <div class="contact-box">
          <div class="section-eyebrow">CONTACT</div>
          <h2 class="intro-title">联系我们</h2>
          <div class="contact-lines">
            <div class="contact-line">
              <el-icon><ChatDotRound /></el-icon>
              <div>
                <div class="line-label">咨询热线</div>
                <a :href="`tel:${CENTER_CONTACT.phone}`" class="line-value phone">{{ CENTER_CONTACT.phone }}</a>
              </div>
            </div>
            <div class="contact-line">
              <el-icon><UserFilled /></el-icon>
              <div>
                <div class="line-label">服务时间</div>
                <div class="line-value">{{ CENTER_CONTACT.serviceTime }}</div>
              </div>
            </div>
            <div class="contact-line">
              <el-icon><ChatDotRound /></el-icon>
              <div>
                <div class="line-label">微信咨询</div>
                <div class="line-value">{{ CENTER_CONTACT.wechat }}</div>
              </div>
            </div>
            <div class="contact-line">
              <el-icon><ChatDotRound /></el-icon>
              <div>
                <div class="line-label">服务范围</div>
                <div class="line-value">{{ CENTER_CONTACT.address }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page-hero {
  background:
    radial-gradient(700px 300px at 90% 0%, rgba(47, 124, 246, 0.14), transparent 60%),
    linear-gradient(180deg, #f4f8ff 0%, #ffffff 100%);
  border-bottom: 1px solid var(--border-color);
  padding: 52px 0 44px;
}

.page-title {
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 10px;
}

.page-sub {
  color: var(--text-secondary);
  font-size: 15px;
}

/* 数字条 */
.nums-section {
  border-bottom: 1px solid var(--border-color);
}

.num-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.num-item {
  text-align: center;
}

.num-value {
  font-size: 40px;
  font-weight: 800;
  background: var(--brand-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.num-label {
  font-size: 13.5px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

/* 介绍 */
.about-intro {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 48px;
  align-items: start;
}

.intro-title {
  font-size: 30px;
  font-weight: 700;
  margin-bottom: 18px;
}

.intro-copy p {
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 2;
  margin-bottom: 14px;
  text-align: justify;
}

.intro-card {
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  padding: 28px 26px;
}

.card-icon {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  background: var(--brand-color-light);
  color: var(--brand-color);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 14px;
}

.promise-list {
  list-style: none;
}

.promise-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  font-size: 14px;
  color: var(--text-secondary);
}

/* 理念 */
.value-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
}

.value-card {
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 28px 24px;
  text-align: center;
}

.value-title {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 10px;
}

.value-desc {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.9;
  text-align: left;
}

/* 流程 + 联系 */
.about-flow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
}

.flow-box,
.contact-box {
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 34px 30px;
}

.flow-list {
  margin-bottom: 22px;
}

.flow-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 0;
  font-size: 14.5px;
  color: var(--text-secondary);
  border-bottom: 1px dashed var(--border-color);
}

.flow-item:last-child {
  border-bottom: none;
}

.flow-index {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--brand-color-light);
  color: var(--brand-color-dark);
  font-weight: 700;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.contact-lines {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.contact-line {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  color: var(--brand-color);
}

.contact-line .el-icon {
  margin-top: 3px;
  font-size: 20px;
}

.line-label {
  font-size: 12.5px;
  color: var(--text-tertiary);
}

.line-value {
  font-size: 15px;
  color: var(--text-main);
  margin-top: 2px;
}

.line-value.phone {
  font-size: 20px;
  font-weight: 800;
  color: var(--brand-color-dark);
}

.btn-icon {
  margin-left: 2px;
}

@media (max-width: 960px) {
  .about-intro,
  .about-flow {
    grid-template-columns: 1fr;
  }

  .num-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }

  .value-grid {
    grid-template-columns: 1fr;
  }
}
</style>
