import type { Space } from './types'

export const DEFAULT_SPACES: Space[] = [
  {
    id: 'space-work',
    name: '工作',
    icon: '💼',
    color: '#3b82f6',
    createdAt: Date.now(),
    groups: [
      {
        id: 'group-dev',
        name: '开发资源',
        collapsed: false,
        items: [
          { id: 'bm-1', url: 'https://github.com', title: 'GitHub', favicon: 'https://github.com/favicon.ico', tags: ['code'], addedAt: Date.now() },
          { id: 'bm-2', url: 'https://stackoverflow.com', title: 'Stack Overflow', favicon: 'https://stackoverflow.com/favicon.ico', tags: ['code'], addedAt: Date.now() },
          { id: 'bm-3', url: 'https://developer.mozilla.org', title: 'MDN Web Docs', favicon: 'https://developer.mozilla.org/favicon.ico', tags: ['docs'], addedAt: Date.now() },
          { id: 'bm-4', url: 'https://npmjs.com', title: 'npm', favicon: 'https://npmjs.com/favicon.ico', tags: ['package'], addedAt: Date.now() },
        ]
      },
      {
        id: 'group-collab',
        name: '协作工具',
        collapsed: false,
        items: [
          { id: 'bm-5', url: 'https://slack.com', title: 'Slack', favicon: 'https://slack.com/favicon.ico', tags: ['chat'], addedAt: Date.now() },
          { id: 'bm-6', url: 'https://notion.so', title: 'Notion', favicon: 'https://notion.so/favicon.ico', tags: ['notes'], addedAt: Date.now() },
          { id: 'bm-7', url: 'https://figma.com', title: 'Figma', favicon: 'https://figma.com/favicon.ico', tags: ['design'], addedAt: Date.now() },
        ]
      }
    ]
  },
  {
    id: 'space-study',
    name: '学习',
    icon: '📚',
    color: '#10b981',
    createdAt: Date.now(),
    groups: [
      {
        id: 'group-ai',
        name: 'AI 学习',
        collapsed: false,
        items: [
          { id: 'bm-8', url: 'https://paperswithcode.com', title: 'Papers with Code', favicon: 'https://paperswithcode.com/favicon.ico', tags: ['ai', 'papers'], addedAt: Date.now() },
          { id: 'bm-9', url: 'https://huggingface.co', title: 'Hugging Face', favicon: 'https://huggingface.co/favicon.ico', tags: ['ai', 'models'], addedAt: Date.now() },
          { id: 'bm-10', url: 'https://arxiv.org', title: 'arXiv', favicon: 'https://arxiv.org/favicon.ico', tags: ['ai', 'papers'], addedAt: Date.now() },
        ]
      },
      {
        id: 'group-courses',
        name: '在线课程',
        collapsed: false,
        items: [
          { id: 'bm-11', url: 'https://coursera.org', title: 'Coursera', favicon: 'https://coursera.org/favicon.ico', tags: ['course'], addedAt: Date.now() },
          { id: 'bm-12', url: 'https://udemy.com', title: 'Udemy', favicon: 'https://udemy.com/favicon.ico', tags: ['course'], addedAt: Date.now() },
        ]
      }
    ]
  },
  {
    id: 'space-life',
    name: '个人',
    icon: '🏠',
    color: '#f59e0b',
    createdAt: Date.now(),
    groups: [
      {
        id: 'group-news',
        name: '资讯',
        collapsed: false,
        items: [
          { id: 'bm-13', url: 'https://news.ycombinator.com', title: 'Hacker News', favicon: 'https://news.ycombinator.com/favicon.ico', tags: ['news', 'tech'], addedAt: Date.now() },
          { id: 'bm-14', url: 'https://v2ex.com', title: 'V2EX', favicon: 'https://v2ex.com/favicon.ico', tags: ['news', 'cn'], addedAt: Date.now() },
          { id: 'bm-15', url: 'https://twitter.com', title: 'Twitter', favicon: 'https://twitter.com/favicon.ico', tags: ['social'], addedAt: Date.now() },
        ]
      },
      {
        id: 'group-entertainment',
        name: '娱乐',
        collapsed: false,
        items: [
          { id: 'bm-16', url: 'https://youtube.com', title: 'YouTube', favicon: 'https://youtube.com/favicon.ico', tags: ['video'], addedAt: Date.now() },
          { id: 'bm-17', url: 'https://reddit.com', title: 'Reddit', favicon: 'https://reddit.com/favicon.ico', tags: ['social'], addedAt: Date.now() },
        ]
      }
    ]
  }
]

export const DEFAULT_ACTIVE_SPACE_ID = 'space-work'
