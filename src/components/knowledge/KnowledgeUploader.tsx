import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadedFile {
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  message?: string;
}

export const KnowledgeUploader: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState('direct_mail');
  const [selectedCategory, setSelectedCategory] = useState('fundamentals');

  const channels = [
    { id: 'direct_mail', name: 'Direct Mail', icon: '📬' },
    { id: 'seo', name: 'SEO', icon: '🔍' },
    { id: 'ppc', name: 'PPC', icon: '💰' },
    { id: 'meta_ads', name: 'Meta Ads', icon: '📱' },
    { id: 'email_marketing', name: 'Email Marketing', icon: '📧' }
  ];

  const categories = {
    direct_mail: ['fundamentals', 'design', 'campaigns', 'production', 'integration', 'templates'],
    seo: ['fundamentals', 'technical', 'content', 'link-building', 'local', 'tools'],
    ppc: ['fundamentals', 'google-ads', 'campaign-structure', 'bidding', 'optimization'],
    meta_ads: ['fundamentals', 'targeting', 'creative', 'campaigns', 'analytics'],
    email_marketing: ['fundamentals', 'design', 'automation', 'deliverability', 'analytics']
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles = selectedFiles.map(file => ({
      name: file.name,
      size: file.size,
      status: 'pending' as const
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles = droppedFiles.map(file => ({
      name: file.name,
      size: file.size,
      status: 'pending' as const
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleUpload = async () => {
    setUploading(true);
    
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue;
      
      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'uploading' } : f
      ));

      try {
        // In real implementation, this would upload to your server
        const formData = new FormData();
        formData.append('file', new Blob([files[i].name])); // Replace with actual file
        formData.append('channel', selectedChannel);
        formData.append('category', selectedCategory);

        // Simulated upload - replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'success', message: 'Uploaded successfully' } : f
        ));
      } catch (error) {
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'error', message: 'Upload failed' } : f
        ));
      }
    }
    
    setUploading(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Upload Knowledge Base Files</h2>
        
        {/* Channel Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Channel</label>
          <div className="flex gap-2 flex-wrap">
            {channels.map(channel => (
              <button
                key={channel.id}
                onClick={() => {
                  setSelectedChannel(channel.id);
                  setSelectedCategory(categories[channel.id][0]);
                }}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  selectedChannel === channel.id
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                }`}
              >
                <span className="mr-2">{channel.icon}</span>
                {channel.name}
              </button>
            ))}
          </div>
        </div>

        {/* Category Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          >
            {categories[selectedChannel].map(cat => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-primary transition-colors"
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg mb-2">Drag and drop your files here</p>
          <p className="text-sm text-gray-500 mb-4">or</p>
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              accept=".md,.txt,.pdf,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <span className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
              Browse Files
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-4">
            Supported formats: .md, .txt, .pdf, .docx
          </p>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-3">Selected Files</h3>
            <div className="space-y-2">
              <AnimatePresence>
                {files.map((file, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === 'uploading' && (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      )}
                      {file.status === 'success' && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {file.status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      {file.message && (
                        <span className={`text-sm ${
                          file.status === 'error' ? 'text-red-500' : 'text-gray-500'
                        }`}>
                          {file.message}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={uploading || files.every(f => f.status !== 'pending')}
              className="mt-4 w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </span>
              ) : (
                'Upload Files'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};