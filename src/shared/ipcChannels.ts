export const IpcChannels = {
  GithubFetchRepo: 'github:fetchRepo',
  ChatSendMessage: 'chat:sendMessage',
  ChatStream: 'chat:stream',
  ChatNewConversation: 'chat:newConversation',
  ChatListConversations: 'chat:listConversations',
  ChatGetMessages: 'chat:getMessages',
  ChatSwitchBranch: 'chat:switchBranch',
  ChatGetFileTree: 'chat:getFileTree',
  ChatDeleteConversation: 'chat:deleteConversation',
  YoutubeFetchVideo: 'youtube:fetchVideo',
  HuggingfaceFetchResource: 'huggingface:fetchResource',
  ChatGetHfSubsets: 'chat:getHfSubsets',
  ChatSetHfSubset: 'chat:setHfSubset',
  SettingsGet: 'settings:get',
  SettingsSet: 'settings:set',
  SettingsListModels: 'settings:listModels',
  SettingsListOllamaModels: 'settings:listOllamaModels'
} as const
