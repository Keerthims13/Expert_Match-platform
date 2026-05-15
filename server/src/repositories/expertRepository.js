import { getDbPool } from '../config/db.js';
import { experts } from '../data/experts.js';

function mapExpertRow(row, specialties, perks) {
  const resolvedRating = row.computed_rating ?? row.rating;
  const resolvedReviewCount = row.computed_review_count ?? row.review_count;
  const resolvedConsultations = row.computed_consultations ?? row.consultations ?? 0;
  const resolvedSuccessRate = row.computed_success_rate ?? row.success_rate ?? 0;
  
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    fullName: row.full_name,
    title: row.title,
    headline: row.headline,
    category: row.category,
    experienceYears: row.experience_years,
    rating: Number(resolvedRating),
    reviewCount: Number(resolvedReviewCount) || 0,
    consultations: Number(resolvedConsultations) || 0,
    successRate: Number(resolvedSuccessRate) || 0,
    avgResponseMinutes: row.avg_response_minutes,
    solvedDoubts: row.solved_doubts,
    pricePerMinute: Number(row.price_per_minute),
    availabilityStatus: row.availability_status || 'offline',
    isOnline: Boolean(row.is_online),
    profileImageUrl: row.profile_image_url,
    about: row.about,
    education: row.education,
    languages: (row.languages || '').split(',').filter(Boolean),
    specialties,
    perks
  };
}

function isMissingSessionRatingsTable(error) {
  return error?.code === 'ER_NO_SUCH_TABLE' && String(error?.sqlMessage || '').includes('session_ratings');
}

function groupValuesByExpertId(rows, keyName) {
  return rows.reduce((accumulator, row) => {
    if (!accumulator[row.expert_id]) {
      accumulator[row.expert_id] = [];
    }

    accumulator[row.expert_id].push(row[keyName]);
    return accumulator;
  }, {});
}

async function ensureBookmarkTableExists() {
  const pool = getDbPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS expert_bookmarks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      expert_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_bookmark (user_id, expert_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_expert_id (expert_id)
    )
  `);
}

async function findExpertFromDb(whereClause, value) {
  const pool = getDbPool();

  let rows;
  try {
    [rows] = await pool.query(
      `
        SELECT
          e.*,
          COALESCE(ROUND(AVG(sr.rating), 1), e.rating) AS computed_rating,
          COALESCE(COUNT(sr.id), e.review_count) AS computed_review_count,
          COALESCE(COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END), 0) AS computed_consultations,
          COALESCE(ROUND(100.0 * SUM(CASE WHEN sr.rating >= 4 THEN 1 ELSE 0 END) / NULLIF(COUNT(sr.id), 0), 0), 0) AS computed_success_rate
        FROM experts e
        LEFT JOIN session_ratings sr ON sr.expert_id = e.id
        LEFT JOIN sessions s ON s.expert_id = e.id
        WHERE ${whereClause}
        GROUP BY e.id
        LIMIT 1
      `,
      [value]
    );
  } catch (error) {
    if (!isMissingSessionRatingsTable(error)) throw error;
    [rows] = await pool.query(
      `SELECT * FROM experts WHERE ${whereClause} LIMIT 1`,
      [value]
    );
  }

  if (!rows.length) return null;

  const expert = rows[0];

  const [[specialtyRows], [perkRows]] = await Promise.all([
    pool.query('SELECT specialty FROM expert_specialties WHERE expert_id = ?', [expert.id]),
    pool.query('SELECT perk FROM expert_perks WHERE expert_id = ?', [expert.id])
  ]);

  return mapExpertRow(
    expert,
    specialtyRows.map((row) => row.specialty),
    perkRows.map((row) => row.perk)
  );
}

async function resolveExpertByIdOrUserIdFromDb(identifier) {
  const numeric = Number(identifier);
  if (!Number.isInteger(numeric) || numeric <= 0) return null;

  const pool = getDbPool();
  const [rows] = await pool.query(
    `
      SELECT *
      FROM experts
      WHERE id = ? OR user_id = ?
      ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END
      LIMIT 1
    `,
    [numeric, numeric, numeric]
  );

  if (!rows.length) return null;
  const expert = rows[0];

  const [[specialtyRows], [perkRows]] = await Promise.all([
    pool.query('SELECT specialty FROM expert_specialties WHERE expert_id = ?', [expert.id]),
    pool.query('SELECT perk FROM expert_perks WHERE expert_id = ?', [expert.id])
  ]);

  return mapExpertRow(
    expert,
    specialtyRows.map((row) => row.specialty),
    perkRows.map((row) => row.perk)
  );
}

async function findAllExpertsFromDb() {
  const pool = getDbPool();
  let expertRows;
  try {
    [expertRows] = await pool.query(
      `
        SELECT
          e.*,
          COALESCE(ROUND(AVG(sr.rating), 1), e.rating) AS computed_rating,
          COALESCE(COUNT(sr.id), e.review_count) AS computed_review_count,
          COALESCE(COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END), 0) AS computed_consultations,
          COALESCE(ROUND(100.0 * SUM(CASE WHEN sr.rating >= 4 THEN 1 ELSE 0 END) / NULLIF(COUNT(sr.id), 0), 0), 0) AS computed_success_rate
        FROM experts e
        LEFT JOIN session_ratings sr ON sr.expert_id = e.id
        LEFT JOIN sessions s ON s.expert_id = e.id
        GROUP BY e.id
        ORDER BY e.created_at DESC, e.id DESC
      `
    );
  } catch (error) {
    if (!isMissingSessionRatingsTable(error)) throw error;
    [expertRows] = await pool.query('SELECT * FROM experts ORDER BY created_at DESC, id DESC');
  }

  if (!expertRows.length) {
    return [];
  }

  const expertIds = expertRows.map((expert) => expert.id);
  const placeholders = expertIds.map(() => '?').join(', ');

  const [specialtyRows] = await pool.query(
    `SELECT expert_id, specialty FROM expert_specialties WHERE expert_id IN (${placeholders})`,
    expertIds
  );

  const [perkRows] = await pool.query(
    `SELECT expert_id, perk FROM expert_perks WHERE expert_id IN (${placeholders})`,
    expertIds
  );

  const specialtiesByExpertId = groupValuesByExpertId(specialtyRows, 'specialty');
  const perksByExpertId = groupValuesByExpertId(perkRows, 'perk');

  return expertRows.map((expert) =>
    mapExpertRow(expert, specialtiesByExpertId[expert.id] || [], perksByExpertId[expert.id] || [])
  );
}

async function findExpertsByIdsFromDb(expertIds) {
  if (!expertIds.length) return [];

  const pool = getDbPool();
  const placeholders = expertIds.map(() => '?').join(', ');
  let expertRows;
  try {
    [expertRows] = await pool.query(
      `
        SELECT
          e.*,
          COALESCE(ROUND(AVG(sr.rating), 1), e.rating) AS computed_rating,
          COALESCE(COUNT(sr.id), e.review_count) AS computed_review_count,
          COALESCE(COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END), 0) AS computed_consultations,
          COALESCE(ROUND(100.0 * SUM(CASE WHEN sr.rating >= 4 THEN 1 ELSE 0 END) / NULLIF(COUNT(sr.id), 0), 0), 0) AS computed_success_rate
        FROM experts e
        LEFT JOIN session_ratings sr ON sr.expert_id = e.id
        LEFT JOIN sessions s ON s.expert_id = e.id
        WHERE e.id IN (${placeholders})
        GROUP BY e.id
      `,
      expertIds
    );
  } catch (error) {
    if (!isMissingSessionRatingsTable(error)) throw error;
    [expertRows] = await pool.query(
      `SELECT * FROM experts WHERE id IN (${placeholders})`,
      expertIds
    );
  }

  const [specialtyRows] = await pool.query(
    `SELECT expert_id, specialty FROM expert_specialties WHERE expert_id IN (${placeholders})`,
    expertIds
  );

  const [perkRows] = await pool.query(
    `SELECT expert_id, perk FROM expert_perks WHERE expert_id IN (${placeholders})`,
    expertIds
  );

  const specialtiesByExpertId = groupValuesByExpertId(specialtyRows, 'specialty');
  const perksByExpertId = groupValuesByExpertId(perkRows, 'perk');

  const expertsById = expertRows.reduce((accumulator, row) => {
    accumulator[row.id] = mapExpertRow(
      row,
      specialtiesByExpertId[row.id] || [],
      perksByExpertId[row.id] || []
    );
    return accumulator;
  }, {});

  return expertIds.map((id) => expertsById[id]).filter(Boolean);
}

async function findMatchesByKeywordsFromDb(keywords, limit) {
  const normalizedKeywords = keywords
    .map((keyword) => String(keyword || '').toLowerCase().trim())
    .filter(Boolean);

  if (!normalizedKeywords.length) {
    return [];
  }

  const pool = getDbPool();
  const whereParts = normalizedKeywords.map(
    () =>
      '(LOWER(es.specialty) LIKE ? OR LOWER(e.category) LIKE ? OR LOWER(e.title) LIKE ? OR LOWER(e.headline) LIKE ? OR LOWER(e.full_name) LIKE ?)'
  );
  const scoreParts = normalizedKeywords.map(
    () =>
      '(CASE WHEN LOWER(es.specialty) LIKE ? THEN 3 ELSE 0 END + CASE WHEN LOWER(e.category) LIKE ? THEN 2 ELSE 0 END + CASE WHEN LOWER(e.title) LIKE ? THEN 1 ELSE 0 END + CASE WHEN LOWER(e.headline) LIKE ? THEN 1 ELSE 0 END + CASE WHEN LOWER(e.full_name) LIKE ? THEN 1 ELSE 0 END)'
  );

  const whereArgs = normalizedKeywords.flatMap((keyword) => {
    const value = `%${keyword}%`;
    return [value, value, value, value, value];
  });

  const scoreArgs = normalizedKeywords.flatMap((keyword) => {
    const value = `%${keyword}%`;
    return [value, value, value, value, value];
  });

  const [matchedRows] = await pool.query(
    `
      SELECT e.id, (${scoreParts.join(' + ')}) AS match_score
      FROM experts e
      JOIN expert_specialties es ON es.expert_id = e.id
      WHERE ${whereParts.join(' OR ')}
      GROUP BY e.id
      ORDER BY match_score DESC, e.rating DESC, e.review_count DESC
      LIMIT ?
    `,
    [...scoreArgs, ...whereArgs, Number(limit)]
  );

  const matchedIds = matchedRows.map((row) => row.id);
  const experts = await findExpertsByIdsFromDb(matchedIds);

  const scoreById = matchedRows.reduce((accumulator, row) => {
    accumulator[row.id] = Number(row.match_score) || 0;
    return accumulator;
  }, {});

  return experts.map((expert) => ({
    ...expert,
    matchScore: scoreById[expert.id] || 0
  }));
}

async function findAllSpecialtiesFromDb() {
  const pool = getDbPool();
  const [rows] = await pool.query(
    'SELECT DISTINCT specialty FROM expert_specialties WHERE specialty IS NOT NULL AND specialty <> ""'
  );

  return rows.map((row) => row.specialty);
}

async function deleteExpertFromDb(whereClause, value) {
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, user_id FROM experts WHERE ${whereClause} LIMIT 1`,
      [value]
    );

    if (!rows.length) {
      await connection.rollback();
      return null;
    }

    const expert = rows[0];

    await connection.query('DELETE FROM users WHERE id = ?', [expert.user_id]);
    await connection.commit();

    return { id: expert.id, userId: expert.user_id };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function withFallback(findFromDb, findFromMemory) {
  try {
    return await findFromDb();
  } catch (_error) {
    return findFromMemory();
  }
}

export const expertRepository = {
  async findAll() {
    return withFallback(() => findAllExpertsFromDb(), () => experts);
  },

  async findBySlug(slug) {
    return withFallback(
      () => findExpertFromDb('slug = ?', slug),
      () => experts.find((expert) => expert.slug === slug) || null
    );
  },

  async findById(id) {
    return withFallback(
      () => findExpertFromDb('id = ?', Number(id)),
      () => experts.find((expert) => expert.id === Number(id)) || null
    );
  },

  async findByUserId(userId) {
    return withFallback(
      () => findExpertFromDb('user_id = ?', Number(userId)),
      () => experts.find((expert) => expert.userId === Number(userId)) || null
    );
  },

  async resolveByIdOrUserId(identifier) {
    return withFallback(
      () => resolveExpertByIdOrUserIdFromDb(identifier),
      () => {
        const numeric = Number(identifier);
        if (!Number.isInteger(numeric) || numeric <= 0) return null;
        return experts.find((expert) => expert.id === numeric || expert.userId === numeric) || null;
      }
    );
  },

  async updateAvailabilityByUserId(userId, availabilityStatus) {
    const pool = getDbPool();
    const [result] = await pool.query(
      `
        UPDATE experts
        SET availability_status = ?,
            is_online = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `,
      [availabilityStatus, availabilityStatus === 'available' ? 1 : 0, Number(userId)]
    );

    if (!result.affectedRows) return null;
    return this.findByUserId(userId);
  },

  async updateProfileImageByUserId(userId, profileImageUrl) {
    const pool = getDbPool();
    const [result] = await pool.query(
      `
        UPDATE experts
        SET profile_image_url = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `,
      [profileImageUrl, Number(userId)]
    );

    if (!result.affectedRows) return null;
    return this.findByUserId(userId);
  },

  async deleteByIdentifier(identifier) {
    const isNumeric = /^\d+$/.test(String(identifier));

    return deleteExpertFromDb(isNumeric ? 'id = ?' : 'slug = ?', isNumeric ? Number(identifier) : identifier);
  },

  async findMatchesByKeywords(keywords, limit = 5) {
    return withFallback(
      () => findMatchesByKeywordsFromDb(keywords, limit),
      () => {
        const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());
        const scored = experts
          .map((expert) => {
            const skills = (expert.specialties || []).map((item) => item.toLowerCase());
            const category = String(expert.category || '').toLowerCase();
            const title = String(expert.title || '').toLowerCase();
            const headline = String(expert.headline || '').toLowerCase();
            const fullName = String(expert.fullName || '').toLowerCase();

            const matchScore = normalizedKeywords.reduce((score, keyword) => {
              let total = score;
              if (skills.some((skill) => skill.includes(keyword))) total += 3;
              if (category.includes(keyword)) total += 2;
              if (title.includes(keyword)) total += 1;
              if (headline.includes(keyword)) total += 1;
              if (fullName.includes(keyword)) total += 1;
              return total;
            }, 0);

            return { ...expert, matchScore };
          })
          .filter((expert) => expert.matchScore > 0)
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, limit);

        return scored;
      }
    );
  },

  async findAllSpecialties() {
    return withFallback(
      () => findAllSpecialtiesFromDb(),
      () => [...new Set(experts.flatMap((expert) => expert.specialties || []))]
    );
  },

  async createProfile(payload) {
    const pool = getDbPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Auto-create user row if not exists (auth not built yet)
      await connection.query(
        'INSERT IGNORE INTO users (id, full_name) VALUES (?, ?)',
        [payload.userId, payload.fullName]
      );

      const [existingRows] = await connection.query(
        'SELECT id FROM experts WHERE user_id = ? LIMIT 1',
        [payload.userId]
      );

      if (existingRows.length) {
        return { duplicateUserProfile: true };
      }

      const [insertResult] = await connection.query(
        `INSERT INTO experts (
          user_id,
          slug,
          full_name,
          title,
          headline,
          category,
          experience_years,
          price_per_minute,
          availability_status,
          is_online,
          about,
          education,
          languages,
          profile_image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.userId,
          payload.slug,
          payload.fullName,
          payload.title,
          payload.headline,
          payload.category,
          payload.experienceYears,
          payload.pricePerMinute,
          payload.availabilityStatus,
          payload.availabilityStatus === 'available' ? 1 : 0,
          payload.about,
          payload.education,
          payload.languages.join(','),
          payload.profileImageUrl
        ]
      );

      const expertId = insertResult.insertId;

      if (payload.skills.length) {
        const skillValues = payload.skills.map((skill) => [expertId, skill]);
        await connection.query(
          'INSERT INTO expert_specialties (expert_id, specialty) VALUES ?',
          [skillValues]
        );
      }

      await connection.commit();

      return { duplicateUserProfile: false, expertId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async toggleBookmark(userId, expertId) {
    await ensureBookmarkTableExists();

    const pool = getDbPool();
    const connection = await pool.getConnection();

    try {
      const [existing] = await connection.query(
        'SELECT id FROM expert_bookmarks WHERE user_id = ? AND expert_id = ?',
        [userId, expertId]
      );

      if (existing.length > 0) {
        await connection.query(
          'DELETE FROM expert_bookmarks WHERE user_id = ? AND expert_id = ?',
          [userId, expertId]
        );
        return { bookmarked: false };
      }

      await connection.query(
        'INSERT INTO expert_bookmarks (user_id, expert_id) VALUES (?, ?)',
        [userId, expertId]
      );
      return { bookmarked: true };
    } finally {
      connection.release();
    }
  },

  async isBookmarked(userId, expertId) {
    await ensureBookmarkTableExists();

    const pool = getDbPool();
    const [rows] = await pool.query(
      'SELECT id FROM expert_bookmarks WHERE user_id = ? AND expert_id = ?',
      [userId, expertId]
    );
    return rows.length > 0;
  },

  async getUserBookmarks(userId) {
    await ensureBookmarkTableExists();

    const pool = getDbPool();
    const [rows] = await pool.query(
      `SELECT e.id, e.user_id, e.slug, e.full_name, e.title, e.headline, e.category,
              e.experience_years, e.rating, e.review_count, e.price_per_minute,
              e.availability_status, e.is_online, e.profile_image_url, e.about,
              e.education, e.languages
       FROM experts e
       INNER JOIN expert_bookmarks eb ON e.id = eb.expert_id
       WHERE eb.user_id = ?
       ORDER BY eb.created_at DESC`,
      [userId]
    );

    if (!rows.length) return [];

    // Load specialties and perks
    const expertIds = rows.map((row) => row.id);
    const placeholders = expertIds.map(() => '?').join(',');

    const [specialtyRows] = await pool.query(
      `SELECT expert_id, specialty FROM expert_specialties WHERE expert_id IN (${placeholders})`,
      expertIds
    );

    const [perkRows] = await pool.query(
      `SELECT expert_id, perk FROM expert_perks WHERE expert_id IN (${placeholders})`,
      expertIds
    );

    const specialtiesByExpertId = groupValuesByExpertId(specialtyRows, 'specialty');
    const perksByExpertId = groupValuesByExpertId(perkRows, 'perk');

    return rows.map((row) =>
      mapExpertRow(row, specialtiesByExpertId[row.id] || [], perksByExpertId[row.id] || [])
    );
  },

  async findWithFilters(filters = {}) {
    const experts = await findAllExpertsFromDb();

    return experts.filter((expert) => {
      if (filters.minRating !== undefined && Number(expert.rating) < Number(filters.minRating)) {
        return false;
      }

      if (filters.maxRating !== undefined && Number(filters.maxRating) < 5 && Number(expert.rating) > Number(filters.maxRating)) {
        return false;
      }

      if (filters.minPrice !== undefined && Number(expert.pricePerMinute) < Number(filters.minPrice)) {
        return false;
      }

      if (filters.maxPrice !== undefined && Number(expert.pricePerMinute) > Number(filters.maxPrice)) {
        return false;
      }

      if (filters.availability && filters.availability !== 'all' && String(expert.availabilityStatus).toLowerCase() !== String(filters.availability).toLowerCase()) {
        return false;
      }

      if (filters.category && filters.category !== 'all' && String(expert.category || '').toLowerCase() !== String(filters.category).toLowerCase()) {
        return false;
      }

      return true;
    });
  },

  async ensureBookmarkTable() {
    await ensureBookmarkTableExists();
  }
};

