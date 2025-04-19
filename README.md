
![Screenshot 2025-05-02 015935](.github/image.png)

 Ridge is a self-hosted, open-source platform designed to integrate autonomous agents with advanced AI capabilities. It allows users to manage and automate a wide range of tasks, from code generation to data analysis, all while running entirely on local systems. With support for multiple AI models and a customizable environment, Ridge ensures privacy, flexibility, and full control, eliminating reliance on cloud services or external infrastructure.

## Key Features

 1. **Customizable Task Workflow**  
    Tailor the system to your specific needs with configuration files in YAML or JSON format.  
    Define workflows for different agents, prioritize tasks, and set operational rules to ensure consistency.  
    Automatically flag inefficiencies or errors in task execution and logic flow.

 2. **Local AI-Powered Execution**  
    Integrate multiple AI models locally to handle complex tasks, from code generation to document analysis.  
    Combine traditional programming logic with advanced AI reasoning for optimized task management.  
    Analyze inputs based on your custom setup, and get actionable feedback on improving task execution.

 3. **Multi-Agent Architecture**  
    Build and deploy a suite of agents, each with a specialized function, such as coding assistants, data analyzers, or project managers.  
    Utilize various AI models based on specific use cases, such as code reviews, natural language processing, or file management.  
    Integrate seamlessly with local tools for file manipulation, task scheduling, and more.

 4. **Seamless Local Integration**  
    Operates entirely on local systems, offering full privacy and control over all data.  
    Integrates with existing development environments and tools without the need for cloud services or external infrastructure.  
    Designed for developers, researchers, and creators to automate tasks with minimal overhead and maximum flexibility.

 5. **Flexible Model Integration**  
    Choose the optimal AI model for your tasks:  
    Use OpenAI Codex for code generation, GPT-4 for documentation tasks, or other models tailored to your needs.  
    Supports both commercial and open-source AI models for ultimate flexibility, all configurable through the project's settings files.

 6. **Privacy-Focused Design**  
    Ensure that all tasks are processed locally, safeguarding your data and reducing exposure to potential privacy risks.  
    No cloud dependencies mean complete control over your workflows and sensitive information.

    # 🚀 Setup Instructions

## Prerequisites

- **Node.js v18** or higher
- **npm** or **yarn**
- **GitHub account** and repository (for GitHub integration)

## Installation

 1. **Clone the repository**

     ```bash
     git clone git@github.com:Martposting/Temporary.git
     cd Ridge
     ```

 2. **Install dependencies**

     ```bash
     npm install
     ```

 3. **Configure Ridge**

    Run the CLI configuration tool to set up Ridge for your use case:

     ```bash
     npm run dev
     ```

    This will prompt you to select:
    - Your use case (code review, documentation review, etc.)
    - API endpoint for your LLM
    - Preferred language model

    Alternatively, you can manually create a `Ridge-config.json` file in the project root:

     ```json
     {
       "useCase": "Code Review",
       "apiEndpoint": "YOUR_LLM_API_ENDPOINT",
       "selectedModel": "YOUR_PREFERRED_MODEL"
     }
     ```

 4. **Setup GitHub App (for GitHub integration)**

    - Create a new GitHub App in your GitHub account
    - Set the following permissions:
      - Pull requests: Read & Write
      - Repository contents: Read
      - Subscribe to pull request events
    - Generate and download a private key
    - Install the app on your repositories

 5. **Configure environment variables (create a `.env` file)**

     ```bash
     APP_ID=your_github_app_id
     PRIVATE_KEY=your_github_app_private_key
     WEBHOOK_SECRET=your_webhook_secret
     ```

 6. **Start Ridge**

     ```bash
     npm start
     ```

 ---

## Technical Requirements

- **LLM Integration**: Use models like Qwen/Qwen2.5-Coder-32B-Instruct, DeepSeek-Coder-V2-Instruct, etc., from Hugging Face or Ollama.
- **Python REPL**: Use LangChain Python REPL tool or a custom REPL like "pai".
- **CI/CD Pipeline**: Implement using tools like Jenkins, GitLab CI, or GitHub Actions.
- **Security**: Integrate security scanning tools within the CI/CD pipeline.
- **Documentation**: Use arc42 for structuring architectural decisions.

 ---

## How it Works

### Environment Setup

 1. Create a `.env` file in the project directory and add your API key for Google Gemini. Refer to `.env.example` for the required keys.
 2. Install the required Python packages:

     ```bash
     pip install -r requirements.txt
     ```

### Main Application (`main.py`)

- The main script initializes a chat interface where you can interact with the coding assistant.
- It takes user input, passes it to the agent executor, and displays the response.
- It maintains a chat history to provide context for future interactions.

### Model Management (`model_manager.py`)

- This file sets up the Google Gemini language model and its API.
- Configures a ReAct agent using a prompt defined in `prompts.py`. The prompt is loaded from the LangChain hub and the template is set from the `prompts.py` file.
- Defines the tools that the agent can use, which are defined in `tools.py`.

### Prompt Template (`prompts.py`)

- This file contains the prompt template used by the ReAct agent. It instructs the agent on how to behave, use tools, and follow a specific format for its responses.

### Tools (`tools.py`)

 This file defines the custom tools available to the agent:

- **List Directory**: Useful for getting files in a directory.  
   Args: `directory: str` (use `.` for the current directory).

- **Write Code**: Useful for writing code to a file.  
   Args: `{'filename': filename, 'code': code}` (both filename and code should be strings).

- **Read File**: Useful for reading a file.  
   Args: `filename: str`

- **Execute Commands**: Useful for running commands on Windows 11 operating systems, using PowerShell CLI, etc.  
   Args: `command: str`

- **Search Internet**: Useful for searching documentation or error-fixing guides.  
   Args: `query: str`

- **Scrape Website**: Useful for scraping a website to get more information about a link.  
   Args: `query: str` (the link to the website obtained from the Search Internet tool).

- **Notebook Reader**: Useful for reading an `.ipynb` notebook.  
   Args: `filename: str`

 ---

## Quickstart

 To quickly start **ownAI** using Docker, follow these steps:

 1. Clone the repository:

     ```bash
     git clone https://github.com/own-ai/own-ai.git
     cd own-ai
     ```

 2. Copy the configuration file:

     ```bash
     cp .env.example .env
     ```

 3. Edit the `.env` file and adapt it to your settings. For local development, you can leave the file as it is. In a production environment, you'll need to edit the values.

 4. Start the Docker containers:

     ```bash
     docker compose up -d
     ```

 5. Wait until the containers have started.

 6. Download an embeddings model:

     ```bash
     docker exec -it ownai-ollama-1 ollama pull nomic-embed-text
     ```

 7. Download an LLM model:

     ```bash
     docker exec -it ownai-ollama-1 ollama pull phi3:mini
     ```

 8. Create a user:

     ```bash
     docker exec -it ownai-ownai-1 npm run admin:set-user-password
     ```

 9. Open **<http://localhost:3000/lab>** and log in with the user you created.

 10. Create your first AI. Please enter "default" as the URL for the first AI so that it can be accessed on the home page without a sub-path.

 11. Access your AI at **<http://localhost:3000>**.
