const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const { Parser } = require('json2csv');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "glazbeni_festivali",
  password: "bazepodataka",
  port: 5432,
});

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
    const result = await pool.query(buildSQL(query, atribut), buildParams(query));
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

function buildParams(query) {
  if (!query) return [];
  return [`%${query}%`];
}

app.get('/api/festivali/csv', async (req, res) => {
  const { query = '', atribut = 'svi' } = req.query;
  try {
    const result = await pool.query(buildSQL(query, atribut), buildParams(query));
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

//3. lab - REST API

//api za dohvaćanje svih festivala
app.get("/api", async (req, res) => {
  try {
    let sql = `
      SELECT f.*, 
             ARRAY_AGG(i.ime_izvodjaca) AS izvodjaci
      FROM festivali f
      LEFT JOIN nastupi n ON f.festival_id = n.festival_id
      LEFT JOIN izvodjaci i ON n.izvodjac_id = i.izvodjac_id
      GROUP BY f.festival_id ORDER BY f.festival_id
    `;

    const result = await pool.query(sql);
    res.status(200).json({
      status: "OK",
      message: "Dohvaćena lista festivala",
      response: result.rows
    });
  } catch (err) {
    res.status(500).json({
      status: "ERROR",
      message: "Greška pri dohvaćanju festivala",
      response: null
    });
  }
});

//api za dohvaćanje festivala po ID-u
app.get("/api/festivali/:id", async (req, res) => {
  try {
    const { id } = req.params;

    let sql = `
      SELECT f.*, 
             ARRAY_AGG(i.ime_izvodjaca) AS izvodjaci
      FROM festivali f
      LEFT JOIN nastupi n ON f.festival_id = n.festival_id
      LEFT JOIN izvodjaci i ON n.izvodjac_id = i.izvodjac_id
      WHERE f.festival_id = $1
      GROUP BY f.festival_id ORDER BY f.festival_id
    `;

    const result = await pool.query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "Not Found",
        message: "Festival nije pronađen",
        response: null
      });
    }

    const festival = result.rows[0];

    res.status(200).json({
      status: "OK",
      message: "Dohvaćen festival",
      response: festival
    });
  } catch (err) {
    res.status(500).json({
      status: "ERROR",
      message: "Greška pri dohvaćanju festivala",
      response: null
    });
  }
});

//api za dohvaćanje izvođača za određeni festival
app.get("/api/festivali/:id/izvodjaci", async (req, res) => {
  try {
    const { id } = req.params;

    let sql = `
      SELECT i.ime_izvodjaca
      FROM nastupi n
      JOIN izvodjaci i ON n.izvodjac_id = i.izvodjac_id
      WHERE n.festival_id = $1
    `;

    const result = await pool.query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "Not Found",
        message: "Festival nije pronađen",
        response: null
      });
    }

    res.status(200).json({
      status: "OK",
      message: "Dohvaćeni izvođači za festival",
      response: result.rows
    });
  } catch (err) {
    res.status(500).json({
      status: "ERROR",
      message: "Greška pri dohvaćanju izvođača za festival",
      response: null
    });
  }
});

//api za dohvaćanje festivala po državi
app.get("/api/festivali/drzava/:drzava", async (req, res) => {
  try {

    const { drzava } = req.params;

    let sql = `
      SELECT f.*, 
             ARRAY_AGG(i.ime_izvodjaca) AS izvodjaci
      FROM festivali f
      LEFT JOIN nastupi n ON f.festival_id = n.festival_id
      LEFT JOIN izvodjaci i ON n.izvodjac_id = i.izvodjac_id
      WHERE f.država ILIKE $1
      GROUP BY f.festival_id ORDER BY f.festival_id
    `;

    const result = await pool.query(sql, ['%' + drzava]);

    res.status(200).json({
      status: "OK",
      message: "Filtriranje po državi",
      response: result.rows
    });
  } catch {
    res.status(500).json({
      status: "ERROR",
      message: "Greška pri filtriranju po državi",
      response: null
    });
  }
});

//api za dohvaćanje festivala po gradu
app.get("/api/festivali/grad/:grad", async (req, res) => {
  try {

    const { grad } = req.params;
    let sql = `
      SELECT f.*, 
             ARRAY_AGG(i.ime_izvodjaca) AS izvodjaci
      FROM festivali f
      LEFT JOIN nastupi n ON f.festival_id = n.festival_id
      LEFT JOIN izvodjaci i ON n.izvodjac_id = i.izvodjac_id
      WHERE f.grad ILIKE $1
      GROUP BY f.festival_id ORDER BY f.festival_id
    `;

    const result = await pool.query(sql, ['%' + grad]);

    res.status(200).json({
      status: "OK",
      message: "Filtriranje po gradu",
      response: result.rows
    });
  } catch {
    res.status(500).json({
      status: "ERROR",
      message: "Greška pri filtriranju po gradu",
      response: null
    });
  }
});

//api za dodavanje novog festivala
app.post("/api", async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      naziv_festivala,
      država,
      grad,
      datum_početka,
      datum_završetka,
      cijena_ulaznica,
      žanrovi_glazbe, 
      organizator,
      web_stranica,
      izvodjaci
    } = req.body;

    if (
      !naziv_festivala ||
      !država ||
      !grad ||
      !datum_početka ||
      !datum_završetka ||
      !cijena_ulaznica ||
      !žanrovi_glazbe ||
      !organizator ||
      !web_stranica ||
      !izvodjaci ||
      !Array.isArray(izvodjaci)
    ) {
      return res.status(400).json({
        status: "ERROR",
        message: "Neispravni ili nepotpuni podaci",
        response: null
      });
    }

    await client.query("BEGIN");

    const festivalResult = await client.query(
      `INSERT INTO festivali
       (naziv_festivala, država, grad, datum_početka, datum_završetka,
        cijena_ulaznica, žanrovi_glazbe, organizator, web_stranica)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING festival_id`,
      [
        naziv_festivala,
        država,
        grad,
        datum_početka,
        datum_završetka,
        cijena_ulaznica,
        žanrovi_glazbe,
        organizator,
        web_stranica
      ]
    );

    const festivalId = festivalResult.rows[0].festival_id;

    for (const izvodjac of izvodjaci) {
      // pokušaj pronaći izvođača
      let izvodjacResult = await client.query(
        "SELECT izvodjac_id FROM izvodjaci WHERE ime_izvodjaca = $1",
        [izvodjac]
      );

      let izvodjacId;

      // ako ne postoji – dodaj ga
      if (izvodjacResult.rows.length === 0) {
        const insertIzvodjac = await client.query(
          "INSERT INTO izvodjaci (ime_izvodjaca) VALUES ($1) RETURNING izvodjac_id",
          [izvodjac]
        );
        izvodjacId = insertIzvodjac.rows[0].izvodjac_id;
      } else {
        izvodjacId = izvodjacResult.rows[0].izvodjac_id;
      }

      // poveži festival i izvođača
      await client.query(
        "INSERT INTO nastupi (festival_id, izvodjac_id) VALUES ($1, $2)",
        [festivalId, izvodjacId]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      status: "OK",
      message: "Festival uspješno dodan",
      response: { 
        festival_id: festivalId 
      }
    });
  } catch {
    await client.query("ROLLBACK");
    res.status(500).json({
      status: "ERROR",
      message: "Greška na serveru",
      response: null
    });
  } finally {
    client.release();
  }
});

//api za osvježavanje resursa
app.put("/api/festivali/:id/grad", async (req, res) => {
  try {
    const { id } = req.params;
    const { grad } = req.body;

    const result = await pool.query(
      "UPDATE festivali SET grad=$1 WHERE festival_id=$2 RETURNING *",
      [grad, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "Not Found",
        message: "Festival nije pronađen",
        response: null
      });
    }

    res.status(200).json({
      status: "OK",
      message: "Festival uspješno ažuriran",
      response: result.rows[0]
    });
  } catch {
    res.status(400).json({
      status: "ERROR",
      message: "Greška pri ažuriranju",
      response: null
    });
  }
});

//api za brisanje festivala po ID-u
app.delete("/api/festivali/:id", async (req, res) => {
  try {
     const result = await pool.query(
      "DELETE FROM festivali WHERE festival_id=$1",
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: "Not Found",
        message: "Festival nije pronađen",
        response: null
      });
    }

    res.status(200).json({
      status: "OK",
      message: "Festival obrisan",
      response: null
    });
  } catch {
    res.status(500).json({
      status: "ERROR",
      message: "Greška pri brisanju",
      response: null
    });
  }
});

// middleware za hvatanje nepostojećih ruta
app.use((req, res, next) => {
  res.status(404).json({
    status: "ERROR",
    message: "Nepostojeća ruta",
    response: null
  });
});

// globalni error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: "ERROR",
    message: "Greška na serveru",
    response: null
  });
});


app.listen(port, () => {
  console.log(`Server radi na http://localhost:${port}`);
});
