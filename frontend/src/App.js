import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { 
  File, 
  Folder, 
  FolderOpen, 
  Play, 
  Plus, 
  X, 
  Save,
  FileText,
  Terminal,
  Settings,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// File system management
const DEFAULT_FILES = {
  'main.js': { 
    content: '// Welcome to the VS Code-like Web Editor!\nconsole.log("Hello, World!");\n\n// Try running some JavaScript code\nconst sum = (a, b) => a + b;\nconsole.log("2 + 3 =", sum(2, 3));', 
    language: 'javascript',
    type: 'file'
  },
  'example.py': { 
    content: '# Python Example\nprint("Hello from Python!")\n\n# Simple calculation\ndef add_numbers(a, b):\n    return a + b\n\nresult = add_numbers(5, 3)\nprint(f"5 + 3 = {result}")', 
    language: 'python',
    type: 'file'
  },
  'styles.css': { 
    content: '/* CSS Example */\nbody {\n  font-family: Arial, sans-serif;\n  background-color: #f0f0f0;\n  margin: 0;\n  padding: 20px;\n}\n\n.container {\n  max-width: 800px;\n  margin: 0 auto;\n  background: white;\n  padding: 20px;\n  border-radius: 8px;\n  box-shadow: 0 2px 10px rgba(0,0,0,0.1);\n}', 
    language: 'css',
    type: 'file'
  },
  'index.html': { 
    content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Web Editor Preview</title>\n    <style>\n        body { font-family: Arial, sans-serif; margin: 20px; }\n        .container { max-width: 600px; margin: 0 auto; }\n        h1 { color: #333; }\n    </style>\n</head>\n<body>\n    <div class="container">\n        <h1>Hello from HTML!</h1>\n        <p>This is a sample HTML file that you can edit and preview.</p>\n        <button onclick="alert(\'Hello JavaScript!\')">Click Me</button>\n    </div>\n</body>\n</html>', 
    language: 'html',
    type: 'file'
  }
};

// File tree component
const FileTree = ({ files, currentFile, onFileSelect, onFileCreate, onFileDelete }) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set(['root']));
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileInput, setShowNewFileInput] = useState(false);

  const toggleFolder = (folderName) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderName)) {
      newExpanded.delete(folderName);
    } else {
      newExpanded.add(folderName);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      onFileCreate(newFileName);
      setNewFileName('');
      setShowNewFileInput(false);
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    switch (ext) {
      case 'js': return '🟨';
      case 'py': return '🐍';
      case 'html': return '🌐';
      case 'css': return '🎨';
      case 'json': return '📦';
      case 'md': return '📝';
      default: return '📄';
    }
  };

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <span className="file-tree-title">EXPLORER</span>
        <button 
          className="icon-button"
          onClick={() => setShowNewFileInput(true)}
          title="New File"
        >
          <Plus size={16} />
        </button>
      </div>
      
      <div className="file-tree-content">
        <div className="folder-header" onClick={() => toggleFolder('root')}>
          {expandedFolders.has('root') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          {expandedFolders.has('root') ? <FolderOpen size={16} /> : <Folder size={16} />}
          <span>Project</span>
        </div>
        
        {expandedFolders.has('root') && (
          <div className="file-list">
            {showNewFileInput && (
              <div className="new-file-input">
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateFile()}
                  onBlur={handleCreateFile}
                  placeholder="filename.ext"
                  autoFocus
                />
              </div>
            )}
            
            {Object.keys(files).map(fileName => (
              <div 
                key={fileName}
                className={`file-item ${currentFile === fileName ? 'active' : ''}`}
                onClick={() => onFileSelect(fileName)}
              >
                <span className="file-icon">{getFileIcon(fileName)}</span>
                <span className="file-name">{fileName}</span>
                <button 
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileDelete(fileName);
                  }}
                  title="Delete file"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Output panel component
const OutputPanel = ({ output, isLoading }) => {
  return (
    <div className="output-panel">
      <div className="output-header">
        <Terminal size={16} />
        <span>Output</span>
      </div>
      <div className="output-content">
        {isLoading ? (
          <div className="loading">Running code...</div>
        ) : (
          <pre className="output-text">{output || 'Click "Run" to execute code...'}</pre>
        )}
      </div>
    </div>
  );
};

// Main App component
function App() {
  const [files, setFiles] = useState(() => {
    const savedFiles = localStorage.getItem('editor-files');
    return savedFiles ? JSON.parse(savedFiles) : DEFAULT_FILES;
  });
  
  const [currentFile, setCurrentFile] = useState('main.js');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [isDragging, setIsDragging] = useState(false);

  // Save files to localStorage whenever files change
  useEffect(() => {
    localStorage.setItem('editor-files', JSON.stringify(files));
  }, [files]);

  const getCurrentFileContent = () => {
    return files[currentFile]?.content || '';
  };

  const getCurrentFileLanguage = () => {
    return files[currentFile]?.language || 'javascript';
  };

  const handleFileContentChange = (value) => {
    setFiles(prev => ({
      ...prev,
      [currentFile]: {
        ...prev[currentFile],
        content: value || ''
      }
    }));
  };

  const handleFileCreate = (fileName) => {
    if (!fileName || files[fileName]) return;
    
    const extension = fileName.split('.').pop().toLowerCase();
    let language = 'javascript';
    let defaultContent = '';
    
    switch (extension) {
      case 'py':
        language = 'python';
        defaultContent = '# New Python file\nprint("Hello, Python!")';
        break;
      case 'html':
        language = 'html';
        defaultContent = '<!DOCTYPE html>\n<html>\n<head>\n    <title>New Page</title>\n</head>\n<body>\n    <h1>Hello, HTML!</h1>\n</body>\n</html>';
        break;
      case 'css':
        language = 'css';
        defaultContent = '/* New stylesheet */\nbody {\n    margin: 0;\n    padding: 0;\n}';
        break;
      case 'json':
        language = 'json';
        defaultContent = '{\n    "name": "example",\n    "version": "1.0.0"\n}';
        break;
      default:
        defaultContent = '// New JavaScript file\nconsole.log("Hello, World!");';
    }
    
    setFiles(prev => ({
      ...prev,
      [fileName]: {
        content: defaultContent,
        language,
        type: 'file'
      }
    }));
    setCurrentFile(fileName);
  };

  const handleFileDelete = (fileName) => {
    if (Object.keys(files).length <= 1) return; // Don't delete if it's the last file
    
    const newFiles = { ...files };
    delete newFiles[fileName];
    setFiles(newFiles);
    
    if (currentFile === fileName) {
      setCurrentFile(Object.keys(newFiles)[0]);
    }
  };

  const handleRunCode = async () => {
    setIsLoading(true);
    setOutput(''); // Clear previous output
    
    try {
      const code = getCurrentFileContent();
      const language = getCurrentFileLanguage();
      
      console.log('Executing code:', { code: code.substring(0, 100), language }); // Debug log
      
      // For JavaScript, we can run it in the browser
      if (language === 'javascript') {
        try {
          // Capture console.log output
          const logs = [];
          const originalLog = console.log;
          console.log = (...args) => {
            logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '));
            originalLog(...args);
          };
          
          // Create a new function and execute it
          const result = new Function(code)();
          
          // Restore console.log
          console.log = originalLog;
          
          if (result !== undefined) {
            logs.push(`Return value: ${result}`);
          }
          
          const output = logs.length > 0 ? logs.join('\n') : 'Code executed successfully (no output)';
          console.log('JavaScript output:', output); // Debug log
          setOutput(output);
        } catch (error) {
          const errorOutput = `JavaScript Error: ${error.message}`;
          console.log('JavaScript error:', errorOutput); // Debug log
          setOutput(errorOutput);
        }
      } else {
        // For other languages, use backend API
        console.log('Calling backend API for', language); // Debug log
        
        const response = await fetch(`${BACKEND_URL}/api/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            language
          })
        });
        
        console.log('Backend response status:', response.status); // Debug log
        
        const result = await response.json();
        console.log('Backend response data:', result); // Debug log
        
        if (response.ok) {
          let output = result.output || 'Code executed successfully';
          
          // Show error if present
          if (result.error) {
            output = `Error: ${result.error}`;
          }
          
          console.log('Setting output:', output); // Debug log
          setOutput(output);
        } else {
          const errorOutput = `HTTP Error ${response.status}: ${result.error || result.message || 'Unknown error occurred'}`;
          console.log('API error:', errorOutput); // Debug log
          setOutput(errorOutput);
        }
      }
    } catch (error) {
      const errorOutput = `Network Error: ${error.message}`;
      console.log('Network error:', errorOutput); // Debug log
      setOutput(errorOutput);
    }
    
    setIsLoading(false);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const newWidth = e.clientX;
    if (newWidth > 150 && newWidth < 500) {
      setSidebarWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div className="app">
      {/* Title Bar */}
      <div className="title-bar">
        <div className="title-bar-content">
          <span className="app-title">VS Code Web Editor</span>
          <div className="title-bar-actions">
            <Settings size={16} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Sidebar */}
        <div className="sidebar" style={{ width: sidebarWidth }}>
          <FileTree 
            files={files}
            currentFile={currentFile}
            onFileSelect={setCurrentFile}
            onFileCreate={handleFileCreate}
            onFileDelete={handleFileDelete}
          />
        </div>

        {/* Resizer */}
        <div 
          className="resizer"
          onMouseDown={handleMouseDown}
        />

        {/* Editor Area */}
        <div className="editor-area">
          {/* Tab Bar */}
          <div className="tab-bar">
            <div className="tab active">
              <FileText size={14} />
              <span>{currentFile}</span>
            </div>
          </div>

          {/* Editor */}
          <div className="editor-container">
            <Editor
              height="60vh"
              language={getCurrentFileLanguage()}
              value={getCurrentFileContent()}
              onChange={handleFileContentChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                wordWrap: 'on',
                cursorStyle: 'line',
                selectOnLineNumbers: true,
              }}
            />
          </div>

          {/* Action Bar */}
          <div className="action-bar">
            <button 
              className="run-button"
              onClick={handleRunCode}
              disabled={isLoading}
            >
              <Play size={16} />
              Run Code
            </button>
            <button 
              className="save-button"
              onClick={() => {
                // Files are auto-saved to localStorage
                setOutput('Files saved successfully!');
                setTimeout(() => setOutput(''), 2000);
              }}
            >
              <Save size={16} />
              Save
            </button>
          </div>

          {/* Output Panel */}
          <OutputPanel output={output} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}

export default App;