### Ridge Chat
#### Overview
- Creates a personal assistant for you to inquire and engage with your notes
- Uses [ChatGPT](https://openai.com/blog/chatgpt) and [Ridge search](#ridge-search). [Offline chat](https://github.com/ridge-ai/ridge/issues/201) is coming soon.
- Supports multi-turn conversations with the relevant notes for context
- Shows reference notes used to generate a response
- **Note**: *Your query and top notes from ridge search will be sent to OpenAI for processing*

#### Setup
- [Setup your OpenAI API key in Ridge](#set-your-openai-api-key-in-ridge)

#### Use
1. Open [/chat](http://localhost:42110/chat)[^2]
2. Type your queries and see response by Ridge from your notes

#### Demo
![](./assets/ridge_chat_web_interface.png)

### Details
1. Your query is used to retrieve the most relevant notes, if any, using Ridge search
2. These notes, the last few messages and associated metadata is passed to ChatGPT along with your query for a response
