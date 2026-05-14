import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { HistoryRecord, HistoryFilter } from '@/types'

export const useHistoryStore = defineStore('history', () => {
  // 历史记录列表
  const records = ref<HistoryRecord[]>([])

  // 当前筛选条件
  const filter = ref<HistoryFilter>('all')

  // 搜索关键词
  const searchKeyword = ref('')

  // 是否正在加载
  const isLoading = ref(false)

  // 抽屉是否展开
  const isDrawerOpen = ref(false)

  // 筛选后的记录
  const filteredRecords = computed(() => {
    let result = records.value

    // 时间筛选
    const now = Date.now()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const dayMs = 24 * 60 * 60 * 1000
    switch (filter.value) {
      case 'today':
        result = result.filter((r) => r.timestamp >= todayStart.getTime())
        break
      case 'week':
        result = result.filter((r) => now - r.timestamp < 7 * dayMs)
        break
      case 'month':
        result = result.filter((r) => now - r.timestamp < 30 * dayMs)
        break
    }

    // 关键词搜索（文件名模糊匹配）
    if (searchKeyword.value.trim()) {
      const keyword = searchKeyword.value.toLowerCase()
      result = result.filter((r) => r.originalName.toLowerCase().includes(keyword))
    }

    return result
  })

  // 统计信息
  const stats = computed(() => {
    const total = records.value.length
    const totalSavedBytes = records.value.reduce((sum, r) => sum + r.savedBytes, 0)
    const avgSavedPercent = total > 0
      ? Math.round(records.value.reduce((sum, r) => sum + r.savedPercent, 0) / total)
      : 0
    return { total, totalSavedBytes, avgSavedPercent }
  })

  // 加载记录
  function setRecords(newRecords: HistoryRecord[]) {
    records.value = newRecords
  }

  // 添加记录
  function addRecord(record: HistoryRecord) {
    records.value.unshift(record)
    // 超出上限自动清理已在主进程处理
  }

  // 删除单条
  function removeRecord(id: string) {
    const index = records.value.findIndex((r) => r.id === id)
    if (index !== -1) {
      records.value.splice(index, 1)
    }
  }

  // 清空全部
  function clearAll() {
    records.value = []
  }

  // 批量添加（用于导入）
  function addRecords(newRecords: HistoryRecord[]) {
    const existingIds = new Set(records.value.map((r) => r.id))
    const unique = newRecords.filter((r) => !existingIds.has(r.id))
    records.value = [...unique, ...records.value].slice(0, 100)
  }

  // 切换抽屉
  function toggleDrawer() {
    isDrawerOpen.value = !isDrawerOpen.value
  }

  function openDrawer() {
    isDrawerOpen.value = true
  }

  function closeDrawer() {
    isDrawerOpen.value = false
  }

  return {
    // State
    records,
    filter,
    searchKeyword,
    isLoading,
    isDrawerOpen,
    // Computed
    filteredRecords,
    stats,
    // Actions
    setRecords,
    addRecord,
    removeRecord,
    clearAll,
    addRecords,
    toggleDrawer,
    openDrawer,
    closeDrawer
  }
})
