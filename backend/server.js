// ==========================================
// Movie Watchlist Manager - REST API Server
// ==========================================import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Movie from './models/Movie.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://realmechristina_db_user:christina@ac-ksqflw3-shard-00-00.4z1yvoy.mongodb.net:27017,ac-ksqflw3-shard-00-01.4z1yvoy.mongodb.net:27017,ac-ksqflw3-shard-00-02.4z1yvoy.mongodb.net:27017/examDB?ssl=true&replicaSet=atlas-8l5nad-shard-0&authSource=admin';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB successfully!'))
  .catch((err) => console.log('❌ Database connection error:', err));

// 1. STATS DASHBOARD (MongoDB Aggregation)
app.get('/api/movies/stats', async (req, res) => {
  try {
    const statusCounts = await Movie.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statsObj = { 'To Watch': 0, 'Watching': 0, 'Watched': 0 };
    statusCounts.forEach(s => { statsObj[s._id] = s.count; });

    const watchedAgg = await Movie.aggregate([
      { $match: { status: 'Watched' } },
      {
        $group: {
          _id: null,
          totalRuntime: { $sum: '$runtime' },
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    const topGenreAgg = await Movie.aggregate([
      { $match: { status: 'Watched' } },
      { $group: { _id: '$genre', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    const totalMinutes = watchedAgg.length > 0 ? watchedAgg[0].totalRuntime : 0;
    const totalHoursWatched = (totalMinutes / 60).toFixed(1);
    const avgRating = watchedAgg.length > 0 && watchedAgg[0].avgRating ? Number(watchedAgg[0].avgRating.toFixed(1)) : 0;
    const topGenre = topGenreAgg.length > 0 ? topGenreAgg[0]._id : 'N/A';

    res.status(200).json({
      success: true,
      message: 'Stats fetched successfully',
      data: {
        statusCounts: statsObj,
        totalHoursWatched,
        avgRating,
        topGenre
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, data: null });
  }
});

// 2. WATCH NEXT RECOMMENDATION
app.get('/api/movies/watch-next', async (req, res) => {
  try {
    const nextMovie = await Movie.findOne({ status: 'To Watch' })
      .sort({ priority: -1, runtime: 1 });

    if (!nextMovie) {
      return res.status(404).json({
        success: false,
        message: 'No movies available in "To Watch" status!',
        data: null
      });
    }

    res.status(200).json({
      success: true,
      message: 'Watch next movie found',
      data: nextMovie
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, data: null });
  }
});

// 3. GET MOVIES (Search, Filter, Pagination, Priority Sorting)
app.get('/api/movies', async (req, res) => {
  try {
    const { status, genre, search, page = 1 } = req.query;
    const limit = 6;
    const skip = (Number(page) - 1) * limit;

    const query = {};
    if (status) query.status = status;
    if (genre) query.genre = genre;
    if (search) query.title = { $regex: search, $options: 'i' };

    let sortCriteria = { createdAt: -1 };
    if (status === 'To Watch') {
      sortCriteria = { priority: -1, runtime: 1 };
    }

    const totalMovies = await Movie.countDocuments(query);
    const movies = await Movie.find(query)
      .collation({ locale: 'en', strength: 2 })
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Movies retrieved successfully',
      data: {
        movies,
        currentPage: Number(page),
        totalPages: Math.ceil(totalMovies / limit) || 1,
        totalCount: totalMovies
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, data: null });
  }
});

// 4. ADD NEW MOVIE (With Auto MV Code & Duplicate Prevention)
app.post('/api/movies', async (req, res) => {
  try {
    const { title, genre, releaseYear, runtime, platform, priority } = req.body;
    const currentYear = new Date().getFullYear();

    if (!title || !genre || !releaseYear || !runtime || !platform || !priority) {
      return res.status(400).json({ success: false, message: 'All fields are required.', data: null });
    }
    if (releaseYear < 1950 || releaseYear > currentYear) {
      return res.status(400).json({ success: false, message: `Release Year must be between 1950 and ${currentYear}.`, data: null });
    }
    if (runtime < 30 || runtime > 300) {
      return res.status(400).json({ success: false, message: 'Runtime must be between 30 and 300 minutes.', data: null });
    }
    if (priority < 1 || priority > 5) {
      return res.status(400).json({ success: false, message: 'Priority must be between 1 and 5.', data: null });
    }

    const existing = await Movie.findOne({
      title: { $regex: `^${title.trim()}$`, $options: 'i' },
      releaseYear: Number(releaseYear)
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Movie "${title}" with release year ${releaseYear} already exists!`,
        data: null
      });
    }

    const countThisYear = await Movie.countDocuments({ releaseYear: Number(releaseYear) });
    const sequence = String(countThisYear + 1).padStart(3, '0');
    const movieCode = `MV-${releaseYear}-${sequence}`;

    const newMovie = new Movie({
      movieCode,
      title: title.trim(),
      genre,
      releaseYear: Number(releaseYear),
      runtime: Number(runtime),
      platform,
      priority: Number(priority),
      status: 'To Watch'
    });

    await newMovie.save();
    res.status(201).json({ success: true, message: 'Movie added successfully!', data: newMovie });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Duplicate title and release year.', data: null });
    }
    res.status(500).json({ success: false, message: error.message, data: null });
  }
});

// 5. EDIT MOVIE DETAILS
app.put('/api/movies/:id', async (req, res) => {
  try {
    const { title, genre, runtime, platform, priority } = req.body;
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found', data: null });
    }

    if (runtime && (runtime < 30 || runtime > 300)) {
      return res.status(400).json({ success: false, message: 'Runtime must be between 30 and 300 minutes.', data: null });
    }
    if (priority && (priority < 1 || priority > 5)) {
      return res.status(400).json({ success: false, message: 'Priority must be between 1 and 5.', data: null });
    }

    if (title) movie.title = title.trim();
    if (genre) movie.genre = genre;
    if (runtime) movie.runtime = Number(runtime);
    if (platform) movie.platform = platform;
    if (priority) movie.priority = Number(priority);

    await movie.save();
    res.status(200).json({ success: true, message: 'Movie updated successfully', data: movie });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, data: null });
  }
});

// 6. STATUS TRANSITION & MANDATORY RATING
app.patch('/api/movies/:id/status', async (req, res) => {
  try {
    const { nextStatus, rating } = req.body;
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found', data: null });
    }

    if (movie.status === 'Watched') {
      return res.status(400).json({
        success: false,
        message: 'Status "Watched" is final and cannot be modified.',
        data: null
      });
    }

    const current = movie.status;
    const allowed = {
      'To Watch': ['Watching', 'Watched'],
      'Watching': ['Watched', 'To Watch']
    };

    if (!allowed[current] || !allowed[current].includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid transition from "${current}" to "${nextStatus}".`,
        data: null
      });
    }

    if (nextStatus === 'Watched') {
      if (!rating || rating < 1 || rating > 10) {
        return res.status(400).json({
          success: false,
          message: 'A mandatory rating between 1 and 10 is required when moving to Watched.',
          data: null
        });
      }
      movie.rating = Number(rating);
      movie.watchedDate = new Date();
    }

    movie.status = nextStatus;
    await movie.save();

    res.status(200).json({ success: true, message: `Status updated to ${nextStatus}`, data: movie });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, data: null });
  }
});

// 7. EDIT RATING FOR WATCHED MOVIES
app.patch('/api/movies/:id/rating', async (req, res) => {
  try {
    const { rating } = req.body;
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found', data: null });
    }

    if (movie.status !== 'Watched') {
      return res.status(400).json({
        success: false,
        message: 'Rating can only be modified for movies with status "Watched".',
        data: null
      });
    }

    if (!rating || rating < 1 || rating > 10) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 10.', data: null });
    }

    movie.rating = Number(rating);
    await movie.save();

    res.status(200).json({ success: true, message: 'Rating updated successfully', data: movie });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, data: null });
  }
});

// 8. DELETE MOVIE
app.delete('/api/movies/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found', data: null });
    }

    if (movie.status === 'Watching') {
      return res.status(400).json({
        success: false,
        message: 'Movies currently in "Watching" status cannot be deleted.',
        data: null
      });
    }

    await Movie.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Movie deleted successfully.', data: null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, data: null });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));