import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// UI-only state for liked songs management
interface LikedSongsUIState {
  // Table state
  currentPage: number;
  pageSize: number;
  sortBy: string | null;
  sortOrder: 'asc' | 'desc';

  // Modal state
  selectedTrackForModal: number | null;
  isAnalysisModalOpen: boolean;

  // Column visibility
  columnVisibility: Record<string, boolean>;
}

interface LikedSongsUIContextType extends LikedSongsUIState {
  // Table actions
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSorting: (column: string | null, order: 'asc' | 'desc') => void;

  // Modal actions
  openAnalysisModal: (trackId: number) => void;
  closeAnalysisModal: () => void;

  // Column visibility actions
  setColumnVisibility: (visibility: Record<string, boolean>) => void;
  toggleColumn: (columnId: string) => void;
}

const LikedSongsUIContext = createContext<LikedSongsUIContextType | null>(null);

export const LikedSongsUIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Table state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window === 'undefined') return 20;
    return parseInt(localStorage.getItem('likedSongs_pageSize') || '20');
  });
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal state
  const [selectedTrackForModal, setSelectedTrackForModal] = useState<number | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);

  // Column visibility
  const [columnVisibility, setColumnVisibilityState] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') {
      return {
        select: true,
        title: true,
        artist: true,
        album: true,
        analysisStatus: true,
      };
    }

    const saved = localStorage.getItem('likedSongs_columnVisibility');
    return saved ? JSON.parse(saved) : {
      select: true,
      title: true,
      artist: true,
      album: true,
      analysisStatus: true,
    };
  });

  // Actions
  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(0); // Reset to first page
    localStorage.setItem('likedSongs_pageSize', size.toString());
  }, []);

  const setSorting = useCallback((column: string | null, order: 'asc' | 'desc') => {
    setSortBy(column);
    setSortOrder(order);
  }, []);

  const openAnalysisModal = useCallback((trackId: number) => {
    setSelectedTrackForModal(trackId);
    setIsAnalysisModalOpen(true);
  }, []);

  const closeAnalysisModal = useCallback(() => {
    setSelectedTrackForModal(null);
    setIsAnalysisModalOpen(false);
  }, []);

  const setColumnVisibility = useCallback((visibility: Record<string, boolean>) => {
    setColumnVisibilityState(visibility);
    localStorage.setItem('likedSongs_columnVisibility', JSON.stringify(visibility));
  }, []);

  const toggleColumn = useCallback((columnId: string) => {
    setColumnVisibility({
      ...columnVisibility,
      [columnId]: !columnVisibility[columnId],
    });
  }, [columnVisibility, setColumnVisibility]);

  const value = {
    // State
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
    selectedTrackForModal,
    isAnalysisModalOpen,
    columnVisibility,

    // Actions
    setCurrentPage,
    setPageSize: handleSetPageSize,
    setSorting,
    openAnalysisModal,
    closeAnalysisModal,
    setColumnVisibility,
    toggleColumn,
  };

  return (
    <LikedSongsUIContext.Provider value={value}>
      {children}
    </LikedSongsUIContext.Provider>
  );
};

export const useLikedSongsUIContext = () => {
  const context = useContext(LikedSongsUIContext);
  if (!context) {
    throw new Error('useLikedSongsUIContext must be used within a LikedSongsUIProvider');
  }
  return context;
};