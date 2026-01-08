import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { 
  StickyNote, Plus, Search, Trash2, Edit3, Save, X, 
  Calendar, Tag, Clock, FileText, Star, StarOff
} from 'lucide-react';

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNote, setActiveNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState({ title: '', content: '', tags: '' });
  const [filterTag, setFilterTag] = useState('all');

  // Load notes from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem('ya_notes');
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error('Error parsing notes:', e);
        setNotes([]);
      }
    }
  }, []);

  // Auto-save when leaving page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isEditing && activeNote) {
        const tagsArray = editContent.tags
          .split(',')
          .map(tag => tag.trim().toLowerCase())
          .filter(tag => tag.length > 0);

        const updatedNote = {
          ...activeNote,
          title: editContent.title || 'Untitled Note',
          content: editContent.content,
          tags: tagsArray,
          updatedAt: new Date().toISOString()
        };

        const updatedNotes = notes.map(note => 
          note.id === activeNote.id ? updatedNote : note
        );
        
        localStorage.setItem('ya_notes', JSON.stringify(updatedNotes));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditing, activeNote, editContent, notes]);

  // Save notes to localStorage
  const saveNotes = (updatedNotes) => {
    localStorage.setItem('ya_notes', JSON.stringify(updatedNotes));
    setNotes(updatedNotes);
  };

  // Create new note
  const createNote = () => {
    const newNote = {
      id: Date.now(),
      title: 'Untitled Note',
      content: '',
      tags: [],
      starred: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updatedNotes = [newNote, ...notes];
    saveNotes(updatedNotes);
    setActiveNote(newNote);
    setEditContent({ title: newNote.title, content: newNote.content, tags: '' });
    setIsEditing(true);
  };

  // Update note
  const updateNote = () => {
    if (!activeNote) return;
    
    const tagsArray = editContent.tags
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    const updatedNote = {
      ...activeNote,
      title: editContent.title || 'Untitled Note',
      content: editContent.content,
      tags: tagsArray,
      updatedAt: new Date().toISOString()
    };

    const updatedNotes = notes.map(note => 
      note.id === activeNote.id ? updatedNote : note
    );
    
    saveNotes(updatedNotes);
    setActiveNote(updatedNote);
    setIsEditing(false);
  };

  // Delete note
  const deleteNote = (noteId) => {
    const updatedNotes = notes.filter(note => note.id !== noteId);
    saveNotes(updatedNotes);
    if (activeNote?.id === noteId) {
      setActiveNote(null);
      setIsEditing(false);
    }
  };

  // Toggle star
  const toggleStar = (noteId) => {
    const updatedNotes = notes.map(note =>
      note.id === noteId ? { ...note, starred: !note.starred } : note
    );
    saveNotes(updatedNotes);
    if (activeNote?.id === noteId) {
      setActiveNote(updatedNotes.find(n => n.id === noteId));
    }
  };

  // Get all unique tags
  const allTags = [...new Set(notes.flatMap(note => note.tags || []))];

  // Filter notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesTag = false;
    if (filterTag === 'all') {
      matchesTag = true;
    } else if (filterTag === 'starred') {
      matchesTag = note.starred;
    } else {
      matchesTag = note.tags?.includes(filterTag);
    }
    
    return matchesSearch && matchesTag;
  });

  // Sort notes: starred first, then by updated date
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.starred && !b.starred) return -1;
    if (!a.starred && b.starred) return 1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const selectNote = (note) => {
    // Save current note if editing before switching
    if (isEditing && activeNote) {
      updateNote();
    }
    setActiveNote(note);
    setEditContent({ 
      title: note.title, 
      content: note.content, 
      tags: note.tags.join(', ') 
    });
    setIsEditing(false);
  };

  // Cancel editing - revert to saved content
  const cancelEditing = () => {
    if (activeNote) {
      setEditContent({
        title: activeNote.title,
        content: activeNote.content,
        tags: activeNote.tags.join(', ')
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="app-container">
      <Sidebar />
      
      <main className="main-content">
        <div className="notes-page">
          {/* Notes Sidebar */}
          <div className="notes-sidebar">
            <div className="notes-header">
              <div className="header-top">
                <StickyNote size={22} />
                <h2>My Notes</h2>
              </div>
              <button className="new-note-btn" onClick={createNote}>
                <Plus size={18} />
                New Note
              </button>
            </div>

            {/* Search */}
            <div className="notes-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Tags Filter */}
            <div className="tags-filter">
              <button 
                className={filterTag === 'all' ? 'active' : ''}
                onClick={() => setFilterTag('all')}
              >
                All
              </button>
              <button 
                className={filterTag === 'starred' ? 'active' : ''}
                onClick={() => setFilterTag('starred')}
              >
                <Star size={12} /> Starred
              </button>
              {allTags.slice(0, 3).map(tag => (
                <button 
                  key={tag}
                  className={filterTag === tag ? 'active' : ''}
                  onClick={() => setFilterTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Notes List */}
            <div className="notes-list">
              {sortedNotes.length === 0 ? (
                <div className="no-notes">
                  <FileText size={40} />
                  <p>No notes yet</p>
                  <span>Create your first note to get started</span>
                </div>
              ) : (
                sortedNotes.map(note => (
                  <div 
                    key={note.id} 
                    className={`note-item ${activeNote?.id === note.id ? 'active' : ''}`}
                    onClick={() => selectNote(note)}
                  >
                    <div className="note-item-header">
                      <h4>{note.title}</h4>
                      <button 
                        className="star-btn"
                        onClick={(e) => { e.stopPropagation(); toggleStar(note.id); }}
                      >
                        {note.starred ? <Star size={14} fill="currentColor" /> : <StarOff size={14} />}
                      </button>
                    </div>
                    <p className="note-preview">
                      {note.content.substring(0, 60) || 'No content'}
                      {note.content.length > 60 && '...'}
                    </p>
                    <div className="note-meta">
                      <span className="note-date">
                        <Clock size={12} />
                        {formatDate(note.updatedAt)}
                      </span>
                      {note.tags.length > 0 && (
                        <span className="note-tags">
                          <Tag size={12} />
                          {note.tags.slice(0, 2).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Note Editor */}
          <div className="note-editor">
            {activeNote ? (
              <>
                <div className="editor-header">
                  {isEditing ? (
                    <input
                      type="text"
                      className="title-input"
                      value={editContent.title}
                      onChange={(e) => setEditContent({ ...editContent, title: e.target.value })}
                      placeholder="Note title..."
                    />
                  ) : (
                    <h2>{activeNote.title}</h2>
                  )}
                  
                  <div className="editor-actions">
                    {isEditing ? (
                      <>
                        <button className="save-btn" onClick={updateNote}>
                          <Save size={16} /> Save
                        </button>
                        <button className="cancel-btn" onClick={cancelEditing}>
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="edit-btn" onClick={() => setIsEditing(true)}>
                          <Edit3 size={16} /> Edit
                        </button>
                        <button className="delete-btn" onClick={() => deleteNote(activeNote.id)}>
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="editor-meta">
                  <span>
                    <Calendar size={14} />
                    Created {new Date(activeNote.createdAt).toLocaleDateString()}
                  </span>
                  <span>
                    <Clock size={14} />
                    Updated {formatDate(activeNote.updatedAt)}
                  </span>
                </div>

                {isEditing && (
                  <div className="tags-input">
                    <Tag size={14} />
                    <input
                      type="text"
                      placeholder="Add tags separated by commas..."
                      value={editContent.tags}
                      onChange={(e) => setEditContent({ ...editContent, tags: e.target.value })}
                    />
                  </div>
                )}

                {!isEditing && activeNote.tags.length > 0 && (
                  <div className="note-tags-display">
                    {activeNote.tags.map(tag => (
                      <span key={tag} className="tag-badge">{tag}</span>
                    ))}
                  </div>
                )}

                <div className="editor-content">
                  {isEditing ? (
                    <textarea
                      value={editContent.content}
                      onChange={(e) => setEditContent({ ...editContent, content: e.target.value })}
                      placeholder="Start writing your note..."
                    />
                  ) : (
                    <div className="note-content">
                      {activeNote.content || <span className="empty-content">No content yet. Click Edit to add content.</span>}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="no-note-selected">
                <StickyNote size={60} />
                <h3>Select a note</h3>
                <p>Choose a note from the sidebar or create a new one</p>
                <button className="create-btn" onClick={createNote}>
                  <Plus size={18} />
                  Create New Note
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
