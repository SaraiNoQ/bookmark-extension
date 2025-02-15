import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpTrayIcon, ArrowDownTrayIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import './styles.css';

interface Bookmark {
  id: string;
  title: string;
  url: string;
  icon: string;
  category: string;
}

interface Category {
  name: string;
  bookmarks: Bookmark[];
  isExpanded: boolean;
}

function Popup() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentIcon, setCurrentIcon] = useState('');
  const [loading, setLoading] = useState(true);
  const [showImportError, setShowImportError] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category' | 'bookmark';
    name?: string;
    id?: string;
    category?: string;
  } | null>(null);

  const DATA = [
    {
      id: '1',
      title: 'GitHub',
      url: 'https://github.com',
      icon: '/icons/github.svg',
      category: 'Developer'
    },
    {
      id: '2',
      title: 'Google',
      url: 'https://www.google.com',
      icon: '/icons/google.svg',
      category: 'Tools'
    },
    {
      id: '3',
      title: 'QQ',
      url: 'https://www.google.com',
      icon: '',
      category: 'Social'
    },
    {
      id: '4',
      title: 'DouYin',
      url: 'https://www.douyin.com',
      icon: '/icons/douyin.svg',
      category: 'Entertainment'
    },
    {
      id: '5',
      title: 'QQ',
      url: 'https://www.google.com',
      icon: '',
      category: 'Social'
    },
    {
      id: '6',
      title: 'QQ',
      url: 'https://www.google.com',
      icon: '',
      category: 'Social'
    },
    {
      id: '7',
      title: 'QQ',
      url: 'https://www.google.com',
      icon: '',
      category: 'Social'
    },
    {
      id: '8',
      title: 'QQ',
      url: 'https://www.google.com',
      icon: '',
      category: 'Social'
    },
    {
      id: '9',
      title: 'QQ',
      url: 'https://www.google.com',
      icon: '',
      category: 'Social'
    },
    {
      id: '10',
      title: 'QQ',
      url: 'https://www.google.com',
      icon: '',
      category: 'Social'
    },
    {
      id: '11',
      title: 'QQ',
      url: 'https://www.google.com',
      icon: '',
      category: 'Social'
    },
  ];

  useEffect(() => {
    // 加载书签数据
    const loadBookmarks = async () => {
      try {
        // 初始化一个空数组
        let bookmarks: Bookmark[] = [];

        try {
          const bookmarksData = await chrome.storage.local.get('bookmarks');
          if (bookmarksData?.bookmarks && bookmarksData.bookmarks.length > 0) {
            // 如果 bookmarksData 中有数据，则使用它替换 bookmarks
            bookmarks = bookmarksData.bookmarks;
          } else {
            // 如果没有数据，可以使用默认的书签数据
            bookmarks = DATA;
            // 保存到 chrome.storage
            await chrome.storage.local.set({ bookmarks: DATA });
          }
        } catch (error) {
          console.error('Error loading bookmarks:', error);
          // 遇到异常，多半是数据格式不正确，使用默认的书签数据
          bookmarks = DATA;
        }
        
        // 按分类组织书签
        const categorizedBookmarks = bookmarks.reduce((acc: Category[], bookmark) => {
          const category = acc.find(c => c.name === bookmark.category);
          if (category) {
            category.bookmarks.push(bookmark);
          } else {
            acc.push({
              name: bookmark.category,
              bookmarks: [bookmark],
              isExpanded: false
            });
          }
          return acc;
        }, []);

        setCategories(categorizedBookmarks);
        if (categorizedBookmarks.length > 0) {
          setSelectedCategory(categorizedBookmarks[0].name);
        }
      } catch (error) {
        console.error('Error loading bookmarks:', error);
      }
    };

    // 获取当前标签页信息
    const getCurrentTab = async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.url && tab.title) {
        setCurrentUrl(tab.url);
        setCurrentTitle(tab.title);
      }
    };

    Promise.all([loadBookmarks(), getCurrentTab()]).finally(() => {
      setLoading(false);
    });
  }, []);

    
  // 处理文件导入
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const data = JSON.parse(content);
      
      // 验证数据格式
      if (!Array.isArray(data.bookmarks)) {
        throw new Error('Invalid bookmarks format');
      }

      // 保存到 chrome.storage
      await chrome.storage.local.set({ bookmarks: data.bookmarks });
      
      // 重新加载数据
      window.location.reload();
    } catch (error) {
      console.error('Import error:', error);
      setShowImportError(true);
      setTimeout(() => setShowImportError(false), 3000);
    }
    
    // 清理 input
    event.target.value = '';
  };

  // 处理导出
  const handleExport = () => {
    const data = {
      bookmarks: categories.flatMap(cat => cat.bookmarks),
      categories: categories.map(cat => cat.name)
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 添加分类
  const AddCategory = () => {
    setShowAddCategoryModal(true);
  };

  // 处理添加分类的确认操作
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      return;
    }

    try {
      // 获取现有书签数据
      const bookmarksData = await chrome.storage.local.get('bookmarks');
      const bookmarks = bookmarksData.bookmarks || [];

      // 添加新分类到 categories
      setCategories([
        ...categories,
        {
          name: newCategoryName,
          bookmarks: [],
          isExpanded: false
        }
      ]);

      // 重置状态
      setNewCategoryName('');
      setShowAddCategoryModal(false);
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleCategoryClick = (categoryName: string) => {
    setCategories(categories.map(cat => ({
      ...cat,
      isExpanded: cat.name === categoryName ? !cat.isExpanded : cat.isExpanded
    })));

    // 更新选中状态
    setSelectedCategory(categoryName);
  };

  const createRandomId = () => {
    return Math.floor(Math.random() * 10);
  }

  const checkIconFormat = (icon: string) => {
    if (icon.startsWith('/') && icon.endsWith('.svg')) {
      return icon;
    }
    return `/default${createRandomId()}.svg`;
  };

  const handleSave = async () => {
    const newBookmark: Bookmark = {
      id: Math.random().toString(36).substr(2, 9),
      title: currentTitle,
      url: currentUrl,
      icon: checkIconFormat(currentIcon),
      category: selectedCategory
    };

    try {
      const bookmarksData = await chrome.storage.local.get('bookmarks');
      const bookmarks = bookmarksData.bookmarks || [];
      await chrome.storage.local.set({
        bookmarks: [...bookmarks, newBookmark]
      });
      window.close();
    } catch (error) {
      console.error('Error saving bookmark:', error);
    }
  };

  // 处理删除确认
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const bookmarksData = await chrome.storage.local.get('bookmarks');
      let bookmarks = bookmarksData.bookmarks || [];

      if (deleteTarget.type === 'category') {
        // 删除整个分类
        bookmarks = bookmarks.filter((b: any) => b.category !== deleteTarget.name);
        // 更新 categories 状态
        setCategories(categories.filter(c => c.name !== deleteTarget.name));
      } else {
        // 删除单个书签
        bookmarks = bookmarks.filter((b: any) => b.id !== deleteTarget.id);
        // 更新 categories 状态
        setCategories(categories.map(cat => {
          if (cat.name === deleteTarget.category) {
            return {
              ...cat,
              bookmarks: cat.bookmarks.filter(b => b.id !== deleteTarget.id)
            };
          }
          return cat;
        }));
      }

      // 保存到 storage
      await chrome.storage.local.set({ bookmarks });
      
      // 重置删除状态
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="popup">
      {/* 添加导入导出按钮 */}
      <div className="import-export-buttons">
        <input
          type="file"
          id="import-input"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <label
          htmlFor="import-input"
          className="action-button"
          title="导入书签"
        > 
          <ArrowUpTrayIcon className="up-arrow" />
        </label>
        <button
          onClick={handleExport}
          className="action-button"
          title="导出书签"
        >
          <ArrowDownTrayIcon className="down-arrow" />
        </button>
        <button
          onClick={AddCategory}
          className="action-button"
          title="添加分类"
        >
          <PlusIcon className="up-arrow" />
        </button>
      </div>

      {/* 错误提示 */}
      {showImportError && (
        <div className="error-toast">
          导入失败：无效的文件格式
        </div>
      )}

      <div className="categories">
        {categories.map(category => (
          <div key={category.name} className="category">
            <div 
              className={`category-header ${selectedCategory === category.name ? 'selected' : ''}`}
              onClick={() => handleCategoryClick(category.name)}
            >
              <span className="dot" style={{ backgroundColor: getCategoryColor(category.name) }} />
              <span className="category-name">{category.name}</span>
              <button
                className="delete-button category-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget({ type: 'category', name: category.name });
                  setShowDeleteModal(true);
                }}
              >
                <svg className="delete-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {category.isExpanded && (
              <div className="bookmarks">
                {category.bookmarks.map(bookmark => (
                  <div key={bookmark.id} className="bookmark">
                    <span>{bookmark.title}</span>
                    <button
                      className="delete-button bookmark-delete"
                      onClick={() => {
                        setDeleteTarget({ 
                          type: 'bookmark', 
                          id: bookmark.id,
                          category: category.name 
                        });
                        setShowDeleteModal(true);
                      }}
                    >
                      <TrashIcon className="delete-icon" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="current-page">
        <input
          type="text"
          value={currentTitle}
          onChange={(e) => setCurrentTitle(e.target.value)}
          placeholder="网址名称"
          className="title-input"
        />
      </div>

      <div className="current-page">
        <input
          type="text"
          value={currentIcon}
          onChange={(e) => setCurrentIcon(e.target.value)}
          placeholder="网址图标（可选）"
          className="title-input"
        />
      </div>

      <div className="actions">
        <button onClick={() => window.close()} className="cancel-button">
          取消
        </button>
        <button onClick={handleSave} className="save-button">
          收藏
        </button>
      </div>

      {/* 添加分类的模态框 */}
      {showAddCategoryModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">添加新分类</h3>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="请输入分类名称"
              className="title-input"
            />
            <div className="modal-actions">
              <button 
                onClick={() => {
                  setShowAddCategoryModal(false);
                  setNewCategoryName('');
                }}
                className="cancel-button"
              >
                取消
              </button>
              <button 
                onClick={handleAddCategory}
                className="save-button"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">确认删除</h3>
            <p className="modal-content">
              {deleteTarget?.type === 'category' 
                ? `是否删除分类"${deleteTarget.name}"及其所有书签？`
                : `是否删除书签？`}
            </p>
            <div className="modal-actions">
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="cancel-button"
              >
                取消
              </button>
              <button 
                onClick={handleDelete}
                className="save-button"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Tools': '#4285F4',
    'Developer': '#34A853',
    'AI': '#EA4335',
    'Entertainment': '#FBBC05',
    'Academic': '#9C27B0',
    'Literature': '#3F51B5',
    'Social': '#FF5722'
  };
  return colors[category] || '#757575';
}

const root = createRoot(document.getElementById('app')!);
root.render(<Popup />); 