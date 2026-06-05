import { getChromeApi } from '../shared/chrome'

const btn = document.getElementById('save-session') as HTMLButtonElement | null
const input = document.getElementById('session-name') as HTMLInputElement | null
const status = document.getElementById('status') as HTMLDivElement | null
const chromeApi = getChromeApi()

if (btn && chromeApi?.runtime) {
  btn.addEventListener('click', () => {
    const name = input?.value || ''
    chromeApi.runtime.sendMessage({ action: 'save-current-session', name }, (resp?: { success?: boolean }) => {
      if (resp && resp.success) {
        if (status) status.textContent = '已保存会话'
        setTimeout(() => { if (status) status.textContent = '' }, 2000)
      } else {
        if (status) status.textContent = '保存失败'
      }
    })
  })
}
