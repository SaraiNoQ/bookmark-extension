import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 加载书签数据
    const loadBookmarks = async () => {
      try {
        const bookmarksData = await chrome.storage.local.get('bookmarks');
        const bookmarks: Bookmark[] = bookmarksData.bookmarks || [];
        
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

  const handleCategoryClick = (categoryName: string) => {
    setCategories(categories.map(cat => ({
      ...cat,
      isExpanded: cat.name === categoryName ? !cat.isExpanded : cat.isExpanded
    })));
  };

  const handleSave = async () => {
    const newBookmark: Bookmark = {
      id: Math.random().toString(36).substr(2, 9),
      title: currentTitle,
      url: currentUrl,
      icon: '/default.svg',
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

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="popup">
      <div className="categories">
        {categories.map(category => (
          <div key={category.name} className="category">
            <div 
              className={`category-header ${selectedCategory === category.name ? 'selected' : ''}`}
              onClick={() => handleCategoryClick(category.name)}
            >
              <span className="dot" style={{ backgroundColor: getCategoryColor(category.name) }} />
              <span className="category-name">{category.name}</span>
            </div>
            {category.isExpanded && (
              <div className="bookmarks">
                {category.bookmarks.map(bookmark => (
                  <div key={bookmark.id} className="bookmark">
                    {bookmark.title}
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

      <div className="actions">
        <button onClick={() => window.close()} className="cancel-button">
          取消
        </button>
        <button onClick={handleSave} className="save-button">
          收藏
        </button>
      </div>
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