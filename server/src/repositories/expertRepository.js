import { getDbPool } from '../config/db.js';
import { experts } from '../data/experts.js';

function mapExpertRow(row, specialties, perks) {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    fullName: row.full_name,
    title: row.title,
    headline: row.headline,
    category: row.category,
    experienceYears: row.experience_years,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    consultations: row.consultations,
    successRate: row.success_rate,
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

function groupValuesByExpertId(rows, keyName) {
  return rows.reduce((accumulator, row) => {
    if (!accumulator[row.expert_id]) {
      accumulator[row.expert_id] = [];
    }

    accumulator[row.expert_id].push(row[keyName]);
    return accumulator;
  }, {});
}

async function findExpertFromDb(whereClause, value) {
  const pool = getDbPool();

  const [rows] = await pool.query(
    `SELECT * FROM experts WHERE ${whereClause} LIMIT 1`,
    [value]
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
  const [expertRows] = await pool.query('SELECT * FROM experts ORDER BY created_at DESC, id DESC');

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
  const [expertRows] = await pool.query(
    `SELECT * FROM experts WHERE id IN (${placeholders})`,
    expertIds
  );

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
  }
};
