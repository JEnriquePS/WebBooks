import { Routes, Route } from 'react-router-dom';
import LibraryView from './components/library/LibraryView';
import { ReaderView } from './components/reader/ReaderView';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LibraryView />} />
      <Route path="/reader/:bookId" element={<ReaderView />} />
    </Routes>
  );
}

export default App;
