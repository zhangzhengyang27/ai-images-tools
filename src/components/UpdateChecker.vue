<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error' | 'not-available'

const status = ref<UpdateStatus>('idle')
const updateInfo = ref<{ version: string; releaseNotes?: string; releaseName?: string } | null>(null)
const downloadProgress = ref({ percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 })
const errorMsg = ref('')
const showPanel = ref(false)

let unsubAvailable: (() => void) | null = null
let unsubNotAvailable: (() => void) | null = null
let unsubProgress: (() => void) | null = null
let unsubDownloaded: (() => void) | null = null
let unsubError: (() => void) | null = null

const checkForUpdates = async () => {
  status.value = 'checking'
  errorMsg.value = ''
  try {
    const result = await window.electronAPI.checkForUpdates()
    if (result.success && result.updateInfo) {
      status.value = 'available'
      updateInfo.value = result.updateInfo
      showPanel.value = true
    } else if (result.success) {
      status.value = 'not-available'
    } else {
      status.value = 'error'
      errorMsg.value = result.error || '检查更新失败'
    }
  } catch {
    status.value = 'error'
    errorMsg.value = '检查更新失败'
  }
}

const downloadUpdate = async () => {
  status.value = 'downloading'
  try {
    await window.electronAPI.downloadUpdate()
  } catch {
    status.value = 'error'
    errorMsg.value = '下载更新失败'
  }
}

const installUpdate = () => {
  window.electronAPI.installUpdate()
}

const statusIcon = () => {
  switch (status.value) {
    case 'checking': return '⏳'
    case 'available': return '🔔'
    case 'downloading': return '⬇️'
    case 'downloaded': return '✅'
    case 'error': return '⚠️'
    case 'not-available': return '✓'
    default: return '🔄'
  }
}

const statusText = () => {
  switch (status.value) {
    case 'checking': return '检查中...'
    case 'available': return `发现新版本 v${updateInfo.value?.version}`
    case 'downloading': return `下载中 ${Math.round(downloadProgress.value.percent)}%`
    case 'downloaded': return '已就绪，可安装'
    case 'error': return errorMsg.value
    case 'not-available': return '已是最新版本'
    default: return '检查更新'
  }
}

onMounted(() => {
  unsubAvailable = window.electronAPI.onUpdateAvailable((info) => {
    status.value = 'available'
    updateInfo.value = info
    showPanel.value = true
  })
  unsubNotAvailable = window.electronAPI.onUpdateNotAvailable(() => {
    status.value = 'not-available'
  })
  unsubProgress = window.electronAPI.onUpdateProgress((data) => {
    downloadProgress.value = data
  })
  unsubDownloaded = window.electronAPI.onUpdateDownloaded(() => {
    status.value = 'downloaded'
  })
  unsubError = window.electronAPI.onUpdateError((data) => {
    status.value = 'error'
    errorMsg.value = data.message
  })
})

onUnmounted(() => {
  unsubAvailable?.()
  unsubNotAvailable?.()
  unsubProgress?.()
  unsubDownloaded?.()
  unsubError?.()
})
</script>

<template>
  <div class="update-checker">
    <button
      class="title-bar__action-btn"
      :title="statusText()"
      @click="status === 'idle' || status === 'error' || status === 'not-available'
        ? checkForUpdates()
        : (showPanel = !showPanel)"
    >
      {{ statusIcon() }}
    </button>

    <Teleport to="body">
      <div v-if="showPanel" class="update-panel-overlay" @click.self="showPanel = false">
        <div class="update-panel">
          <div class="update-panel__header">
            <span class="update-panel__title">应用更新</span>
            <button class="update-panel__close" @click="showPanel = false">×</button>
          </div>

          <div class="update-panel__body">
            <!-- 检查中 -->
            <div v-if="status === 'checking'" class="update-panel__status">
              <span class="update-panel__icon">⏳</span>
              <span>正在检查更新...</span>
            </div>

            <!-- 发现新版本 -->
            <div v-if="status === 'available'" class="update-panel__status">
              <span class="update-panel__icon">🔔</span>
              <div>
                <div class="update-panel__version">发现新版本 v{{ updateInfo?.version }}</div>
                <div v-if="updateInfo?.releaseNotes" class="update-panel__notes">
                  {{ updateInfo.releaseNotes }}
                </div>
              </div>
              <button class="update-panel__btn update-panel__btn--primary" @click="downloadUpdate">
                下载更新
              </button>
            </div>

            <!-- 下载中 -->
            <div v-if="status === 'downloading'" class="update-panel__status">
              <span class="update-panel__icon">⬇️</span>
              <div>
                <div>正在下载更新...</div>
                <div class="update-panel__progress">
                  <div class="update-panel__progress-bar">
                    <div
                      class="update-panel__progress-fill"
                      :style="{ width: downloadProgress.percent + '%' }"
                    ></div>
                  </div>
                  <span>{{ Math.round(downloadProgress.percent) }}%</span>
                </div>
              </div>
            </div>

            <!-- 已下载 -->
            <div v-if="status === 'downloaded'" class="update-panel__status">
              <span class="update-panel__icon">✅</span>
              <div>
                <div>更新已下载完成</div>
                <div class="update-panel__hint">安装后应用将自动重启</div>
              </div>
              <button class="update-panel__btn update-panel__btn--primary" @click="installUpdate">
                立即安装
              </button>
            </div>

            <!-- 错误 -->
            <div v-if="status === 'error'" class="update-panel__status">
              <span class="update-panel__icon">⚠️</span>
              <div>
                <div>更新失败</div>
                <div class="update-panel__error">{{ errorMsg }}</div>
              </div>
              <button class="update-panel__btn" @click="checkForUpdates">重新检查</button>
            </div>

            <!-- 无更新 -->
            <div v-if="status === 'not-available'" class="update-panel__status">
              <span class="update-panel__icon">✓</span>
              <span>当前已是最新版本</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.update-panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.update-panel {
  background: #2c2c2e;
  border-radius: 12px;
  width: 340px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  color: rgba(255, 255, 255, 0.9);
}

.update-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.update-panel__title {
  font-size: 14px;
  font-weight: 600;
}

.update-panel__close {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 16px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.update-panel__close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.update-panel__body {
  padding: 16px;
}

.update-panel__status {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.update-panel__icon {
  font-size: 20px;
  flex-shrink: 0;
}

.update-panel__version {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.update-panel__notes {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  max-height: 80px;
  overflow-y: auto;
}

.update-panel__hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
}

.update-panel__error {
  font-size: 12px;
  color: #ff6b6b;
  margin-top: 4px;
}

.update-panel__btn {
  margin-top: 12px;
  padding: 6px 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.update-panel__btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.update-panel__btn--primary {
  background: #0a84ff;
  border-color: #0a84ff;
  color: #fff;
}

.update-panel__btn--primary:hover {
  background: #0070e0;
}

.update-panel__progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.update-panel__progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  overflow: hidden;
}

.update-panel__progress-fill {
  height: 100%;
  background: #0a84ff;
  border-radius: 2px;
  transition: width 0.3s;
}

.update-panel__progress span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  min-width: 36px;
}
</style>