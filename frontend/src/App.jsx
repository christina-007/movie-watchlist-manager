import { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'https://movie-watchlist-api-wzgy.onrender.com/api/movies';
export default function App() {
  const [movies, setMovies] = useState([]);
  const [stats, setStats] = useState(null);
  const [watchNext, setWatchNext] = useState(null);
  const [formError, setFormError] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const initialForm = {
    title: '',
    genre: 'Action',
    releaseYear: 2024,
    runtime: 120,
    platform: 'Netflix',
    priority: 3
  };
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchMovies();
    fetchStats();
  }, [statusFilter, genreFilter, search, page]);

  const fetchMovies = async () => {
    try {
      const query = new URLSearchParams({
        page,
        status: statusFilter,
        genre: genreFilter,
        search
      }).toString();
      const res = await fetch(`${API_BASE}?${query}`);
      const result = await res.json();
      if (result.success) {
        setMovies(result.data.movies);
        setTotalPages(result.data.totalPages);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      const result = await res.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleWatchNext = async () => {
    try {
      const res = await fetch(`${API_BASE}/watch-next`);
      const result = await res.json();
      if (result.success) {
        setWatchNext(result.data);
      } else {
        alert(result.message);
        setWatchNext(null);
      }
    } catch {
      alert('Error fetching recommendation.');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const curYear = new Date().getFullYear();
    if (formData.releaseYear < 1950 || formData.releaseYear > curYear) {
      setFormError(`Release Year must be between 1950 and ${curYear}.`);
      return;
    }
    if (formData.runtime < 30 || formData.runtime > 300) {
      setFormError('Runtime must be between 30 and 300 minutes.');
      return;
    }

    try {
      const url = editingId ? `${API_BASE}/${editingId}` : API_BASE;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await res.json();

      if (!result.success) {
        setFormError(result.message);
        return;
      }

      setFormData(initialForm);
      setEditingId(null);
      fetchMovies();
      fetchStats();
    } catch {
      setFormError('Failed to save movie.');
    }
  };

  const startEdit = (movie) => {
    setEditingId(movie._id);
    setFormData({
      title: movie.title,
      genre: movie.genre,
      releaseYear: movie.releaseYear,
      runtime: movie.runtime,
      platform: movie.platform,
      priority: movie.priority
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStatusChange = async (movie, nextStatus) => {
    let rating = undefined;
    if (nextStatus === 'Watched') {
      const input = prompt('Mandatory: Enter a rating from 1 to 10 for this watched movie:');
      if (!input || isNaN(input) || Number(input) < 1 || Number(input) > 10) {
        alert('A valid rating between 1 and 10 is required.');
        return;
      }
      rating = Number(input);
    }

    try {
      const res = await fetch(`${API_BASE}/${movie._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextStatus, rating })
      });
      const result = await res.json();
      if (!result.success) {
        alert(result.message);
      } else {
        fetchMovies();
        fetchStats();
      }
    } catch {
      alert('Error updating status.');
    }
  };

  const handleEditRating = async (movie) => {
    const input = prompt(`Update rating for "${movie.title}" (1 to 10):`, movie.rating || '');
    if (!input || isNaN(input) || Number(input) < 1 || Number(input) > 10) {
      alert('Enter a valid rating between 1 and 10.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/${movie._id}/rating`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: Number(input) })
      });
      const result = await res.json();
      if (result.success) {
        fetchMovies();
        fetchStats();
      } else {
        alert(result.message);
      }
    } catch {
      alert('Error updating rating.');
    }
  };

  const handleDelete = async (movie) => {
    if (movie.status === 'Watching') return;
    if (!window.confirm(`Delete "${movie.title}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/${movie._id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        fetchMovies();
        fetchStats();
      } else {
        alert(result.message);
      }
    } catch {
      alert('Failed to delete movie.');
    }
  };

  return (
    <div className="container">
      <header>
        <h1>🎬 Movie Watchlist Manager</h1>
        <button className="btn-watch-next" onClick={handleWatchNext}>
          ⚡ What should I watch next?
        </button>
      </header>

      {watchNext && (
        <div className="alert-box">
          <div>
            <strong>Recommended Next:</strong> {watchNext.title} ({watchNext.releaseYear}) | Genre: {watchNext.genre} | Priority: ⭐ {watchNext.priority} | Runtime: {watchNext.runtime} mins
          </div>
          <button onClick={() => setWatchNext(null)}>✕</button>
        </div>
      )}

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>To Watch</h3>
            <p>{stats.statusCounts['To Watch']}</p>
          </div>
          <div className="stat-card">
            <h3>Watching</h3>
            <p>{stats.statusCounts['Watching']}</p>
          </div>
          <div className="stat-card">
            <h3>Watched</h3>
            <p>{stats.statusCounts['Watched']}</p>
          </div>
          <div className="stat-card">
            <h3>Hours Watched</h3>
            <p>{stats.totalHoursWatched}h</p>
          </div>
          <div className="stat-card">
            <h3>Avg Rating</h3>
            <p>⭐ {stats.avgRating}</p>
          </div>
          <div className="stat-card">
            <h3>Top Genre</h3>
            <p>{stats.topGenre}</p>
          </div>
        </div>
      )}

      <div className="form-card">
        <h3>{editingId ? 'Edit Movie' : 'Add New Movie'}</h3>
        {formError && <p className="error-msg">{formError}</p>}
        <form onSubmit={handleFormSubmit}>
          <div className="form-grid">
            <input
              type="text"
              placeholder="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <select
              value={formData.genre}
              onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
            >
              {['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Release Year (1950 - 2026)"
              disabled={!!editingId}
              value={formData.releaseYear}
              onChange={(e) => setFormData({ ...formData, releaseYear: Number(e.target.value) })}
              required
            />
            <input
              type="number"
              placeholder="Runtime (30 - 300 mins)"
              value={formData.runtime}
              onChange={(e) => setFormData({ ...formData, runtime: Number(e.target.value) })}
              required
            />
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
            >
              {['Netflix', 'Prime Video', 'Hotstar', 'Theatre', 'Other'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              max="5"
              placeholder="Priority (1-5)"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
              required
            />
          </div>
          <div style={{ marginTop: '15px' }}>
            <button className="btn-submit" type="submit">
              {editingId ? 'Update Movie' : 'Add Movie'}
            </button>
            {editingId && (
              <button
                className="btn-cancel"
                type="button"
                onClick={() => { setEditingId(null); setFormData(initialForm); }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="To Watch">To Watch</option>
          <option value="Watching">Watching</option>
          <option value="Watched">Watched</option>
        </select>
        <select value={genreFilter} onChange={(e) => { setGenreFilter(e.target.value); setPage(1); }}>
          <option value="">All Genres</option>
          {['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'].map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      <div className="movie-grid">
        {movies.map((m) => {
          const badgeClass =
            m.status === 'Watched'
              ? 'badge badge-watched'
              : m.status === 'Watching'
              ? 'badge badge-watching'
              : 'badge badge-to-watch';

          return (
            <div key={m._id} className="movie-card">
              <div>
                <div className="movie-header">
                  <span className="movie-code">{m.movieCode}</span>
                  <span className={badgeClass}>{m.status}</span>
                </div>
                <div className="movie-title">{m.title}</div>
                <div className="movie-meta">
                  <div><strong>Genre:</strong> {m.genre} ({m.releaseYear})</div>
                  <div><strong>Platform:</strong> {m.platform} | <strong>Runtime:</strong> {m.runtime}m</div>
                  <div><strong>Priority:</strong> ⭐ {m.priority} / 5</div>
                  {m.rating && <div><strong>Rating:</strong> 🏆 {m.rating} / 10</div>}
                  {m.watchedDate && <div><strong>Watched On:</strong> {new Date(m.watchedDate).toLocaleDateString()}</div>}
                </div>
              </div>

              <div className="movie-actions">
                {m.status !== 'Watched' && (
                  <div className="action-row">
                    <span style={{ fontSize: '12px' }}>Move to:</span>
                    {m.status === 'To Watch' && (
                      <>
                        <button className="btn-edit" onClick={() => handleStatusChange(m, 'Watching')}>Watching</button>
                        <button className="btn-edit" onClick={() => handleStatusChange(m, 'Watched')}>Watched</button>
                      </>
                    )}
                    {m.status === 'Watching' && (
                      <>
                        <button className="btn-edit" onClick={() => handleStatusChange(m, 'To Watch')}>To Watch</button>
                        <button className="btn-edit" onClick={() => handleStatusChange(m, 'Watched')}>Watched</button>
                      </>
                    )}
                  </div>
                )}

                {m.status === 'Watched' && (
                  <button className="btn-edit" onClick={() => handleEditRating(m)}>
                    Edit Rating
                  </button>
                )}

                <div className="action-row" style={{ marginTop: '5px' }}>
                  <button className="btn-edit" onClick={() => startEdit(m)}>Edit</button>
                  <button
                    className="btn-delete"
                    disabled={m.status === 'Watching'}
                    title={m.status === 'Watching' ? 'Cannot delete while Watching' : ''}
                    onClick={() => handleDelete(m)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
