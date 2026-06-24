import { useEffect, useState } from 'react'
import type { TabInfo } from '../shared/types'
import { getChromeApi } from '../shared/chrome'

function toTabInfo(tab: chrome.tabs.Tab): TabInfo | null {
  if (tab.id === undefined || !tab.url) {
    return null
  }

  return {
    id: tab.id,
    title: tab.title || tab.url,
    url: tab.url,
    favicon: tab.favIconUrl || '',
    active: !!tab.active
  }
}

function upsertTab(tabs: TabInfo[], tab: TabInfo): TabInfo[] {
  const existingIndex = tabs.findIndex(item => item.id === tab.id)
  if (existingIndex === -1) {
    return [...tabs, tab]
  }

  const next = tabs.slice()
  next[existingIndex] = tab
  return next
}

export function useOpenTabs() {
  const [openTabs, setOpenTabs] = useState<TabInfo[]>([])

  useEffect(() => {
    const chromeApi = getChromeApi()
    if (!chromeApi?.tabs) return

    const refresh = () => {
      chromeApi.tabs.query({}, (tabs) => {
        setOpenTabs(tabs.map(toTabInfo).filter((tab): tab is TabInfo => tab !== null))
      })
    }

    const handleCreated = (tab: chrome.tabs.Tab) => {
      const tabInfo = toTabInfo(tab)
      if (tabInfo) {
        setOpenTabs((current) => upsertTab(current, tabInfo))
      }
    }

    const handleUpdated = (_tabId: number, _changeInfo: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab) => {
      const tabInfo = toTabInfo(tab)
      if (tabInfo) {
        setOpenTabs((current) => upsertTab(current, tabInfo))
      }
    }

    const handleRemoved = (tabId: number) => {
      setOpenTabs((current) => current.filter(tab => tab.id !== tabId))
    }

    const handleActivated = (activeInfo: chrome.tabs.OnActivatedInfo) => {
      chromeApi.tabs.get(activeInfo.tabId, (tab) => {
        if (chromeApi.runtime.lastError) return
        const tabInfo = toTabInfo(tab)
        if (!tabInfo) return

        setOpenTabs((current) => upsertTab(
          current.map(item => ({ ...item, active: item.id === activeInfo.tabId })),
          { ...tabInfo, active: true }
        ))
      })
    }

    refresh()
    chromeApi.tabs.onCreated.addListener(handleCreated)
    chromeApi.tabs.onUpdated.addListener(handleUpdated)
    chromeApi.tabs.onRemoved.addListener(handleRemoved)
    chromeApi.tabs.onActivated.addListener(handleActivated)

    return () => {
      chromeApi.tabs.onCreated.removeListener(handleCreated)
      chromeApi.tabs.onUpdated.removeListener(handleUpdated)
      chromeApi.tabs.onRemoved.removeListener(handleRemoved)
      chromeApi.tabs.onActivated.removeListener(handleActivated)
    }
  }, [])

  return { openTabs, setOpenTabs }
}
