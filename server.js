// server.js
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const { Parser } = require('json2csv');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Postgres konfiguracija
const pool = new Pool({
  user: "postgres", // promijeni prema tvojoj konfiguraciji
  host: "localhost",
  database: "glazbeni_festivali",
  password: "bazepodataka",
  port: 5432,
});

// Ruta za dohvat festivala s filterom
app.get("/api/festivali", async (req, res) => {
  try {
    const { query = "", atribut = "svi" } = req.query;
    console.log(`Filter atribut: ${atribut}, query: ${query}`);

    let sql = `
      SELECT f.*, 
             ARRAY_AGG(i.ime_izvodjaca) AS izvodjaci
      FROM festivali f
      LEFT JOIN nastupi n ON f.festival_id = n.festival_id
      LEFT JOIN izvodjaci i ON n.izvodjac_id = i.izvodjac_id
    `;

    let values = [];
    if (query) {
      if (atribut === "svi") {
        sql += `
          WHERE 
            f.naziv_festivala ILIKE $1 OR
            f.država ILIKE $1 OR
            f.grad ILIKE $1 OR
            f.organizator ILIKE $1 OR
            f.žanrovi_glazbe ILIKE $1 OR
            f.festival_id IN (
                SELECT n.festival_id
                FROM nastupi n
                JOIN izvodjaci i ON n.izvodjac_id = i.izvodjac_id
                WHERE i.ime_izvodjaca ILIKE $1
            )
        `;
        values.push(`%${query}%`);
      } else if (atribut === "izvodjaci") {
        sql += `
            WHERE f.festival_id IN (
                SELECT n.festival_id
                FROM nastupi n
                JOIN izvodjaci i ON n.izvodjac_id = i.izvodjac_id
                WHERE i.ime_izvodjaca ILIKE $1
            )
            `;
        values.push(`%${query}%`);
      } else {
        sql += ` WHERE f.${atribut} ILIKE $1 `;
        values.push(`%${query}%`);
      }
    }

    sql += ` GROUP BY f.festival_id ORDER BY f.festival_id`;

    const result = await pool.query(sql, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Greška pri dohvaćanju podataka" });
  }
});

app.get('/api/festivali/json', async (req, res) => {
  const { query = '', atribut = 'svi' } = req.query;
  try {
    const result = await pool.query(buildSQL(query, atribut), buildParams(query, atribut));
    res.setHeader('Content-Disposition', 'attachment; filename=glazbeni_festivali.json');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Greška pri generiranju JSON-a');
  }
});

function buildSQL(query, atribut) {
  let sql = `
    SELECT f.*, STRING_AGG(i.ime_izvodjaca, ', ') AS izvodjaci
    FROM festivali f
    LEFT JOIN nastupi n ON f.festival_id = n.festival_id
    LEFT JOIN izvodjaci i ON n.izvodjac_id = i.izvodjac_id
  `;
  if (query) {
    if (atribut === 'svi') {
      sql += `
        WHERE f.naziv_festivala ILIKE $1
           OR f.država ILIKE $1
           OR f.grad ILIKE $1
           OR f.organizator ILIKE $1
           OR f.žanrovi_glazbe ILIKE $1
           OR f.festival_id IN (
                SELECT n.festival_id
                FROM nastupi n
                JOIN izvodjaci i ON n.izvodjac_id = i.izvodjac_id
                WHERE i.ime_izvodjaca ILIKE $1
            )
      `;
    } else if (atribut === 'izvodjaci') {
      sql += `
        WHERE f.festival_id IN (
          SELECT n.festival_id
          FROM nastupi n
          JOIN izvodjaci i ON n.izvodjac_id = i.izvodjac_id
          WHERE i.ime_izvodjaca ILIKE $1
        )
      `;
    } else {
      sql += ` WHERE f.${atribut} ILIKE $1 `;
    }
  }
  sql += " GROUP BY f.festival_id ORDER BY f.festival_id";
  return sql;
}

function buildParams(query, atribut) {
  if (!query) return [];
  return [`%${query}%`];
}

app.get('/api/festivali/csv', async (req, res) => {
  const { query = '', atribut = 'svi' } = req.query;
  try {
    const result = await pool.query(buildSQL(query, atribut), buildParams(query, atribut));
    const fields = ['festival_id','naziv_festivala','država','grad','datum_početka','datum_završetka','cijena_ulaznica','žanrovi_glazbe','organizator','web_stranica','izvodjaci'];
    const parser = new Parser({ fields });
    const csv = parser.parse(result.rows);
    res.setHeader('Content-Disposition', 'attachment; filename=glazbeni_festivali.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).send('Greška pri generiranju CSV-a');
  }
});

app.listen(port, () => {
  console.log(`Server radi na http://localhost:${port}`);
});

