drop 
  index if exists trips_stops_idx;
drop 
  table if exists stops CASCADE;
drop 
  table if exists pathways CASCADE;
  drop 
  table if exists  agency CASCADE;
drop 
  table if exists transfers CASCADE;
drop 
  table if exists stop_times CASCADE;
drop 
  table if exists temp_stop_times CASCADE;
drop 
  table if exists trips CASCADE;
drop 
  table if exists routes CASCADE;
  CREATE TABLE agency (
    agency_id VARCHAR(256) PRIMARY KEY,
    agency_name VARCHAR(256),
    agency_url VARCHAR(256),
    agency_timezone VARCHAR(256),
    agency_lang VARCHAR(256),
    agency_phone VARCHAR(256),
    agency_email VARCHAR(256),
    agency_fare_url VARCHAR(256),
    ticketing_deep_link_id VARCHAR(256)

  );

CREATE TABLE stops (
  stop_id VARCHAR(256) PRIMARY KEY, 
  stop_code VARCHAR(256), 
  stop_name VARCHAR(256), 
  stop_desc VARCHAR(256), 
  stop_lat VARCHAR(256), 
  stop_lon VARCHAR(256), 
  zone_id  smallint,
  stop_url VARCHAR(256),
  location_type smallint, 
  parent_station VARCHAR(256),
  stop_timezone VARCHAR(256),
  level_id smallint,
  wheelchair_boarding smallint,
  platform_code VARCHAR(256)


);
CREATE TABLE transfers (
  id serial PRIMARY KEY, from_stop_id VARCHAR(256), 
  to_stop_id VARCHAR(256), transfer_type VARCHAR(256), 
  min_transfer_time int
);
CREATE TABLE stop_times (
  id serial PRIMARY KEY,
  trip_id VARCHAR(256), 
  arrival_time TEXT, 
  departure_time TEXT, 
  stop_id VARCHAR(256), 
  stop_sequence smallint, 
  stop_headsign VARCHAR(256), 
  pickup_type smallint,
  drop_off_type smallint,
  local_zone_id smallint,
  timepoint smallint
);
CREATE TABLE trips (
  route_id VARCHAR(256), 
  service_id VARCHAR(256), 
  trip_id VARCHAR(256), 
  trip_headsign VARCHAR(256), 
  trip_short_name VARCHAR(256), 
  direction_id smallint, 
  shape_id smallint,
  block_id smallint,
  wheelchair_accessible smallint,
  bikes_allowed smallint
);
CREATE TABLE routes (
  route_id VARCHAR(256), 
  agency_id VARCHAR(256), 
  route_short_name VARCHAR(9), 
  route_long_name VARCHAR(256), 
  route_desc VARCHAR(256), 
  route_type smallint, 
  route_url VARCHAR(256), 
  route_color VARCHAR(6), 
  route_text_color VARCHAR(6),
  route_sort_order int
);
  CREATE TABLE pathways (
    pathway_id VARCHAR(256),
    from_stop_id VARCHAR(256),
    to_stop_id VARCHAR(256),
    pathway_mode smallint,
    is_bidirectional smallint,
    length NUMERIC(6,3),
    traversal_time INT,
    stair_count INT,
    max_slope INT,
    min_width INT,
    signposted_as VARCHAR(256),
    reversed_signposted_as VARCHAR(256)


  );
COPY stops (stop_id,stop_code,stop_name,stop_desc,stop_lon,stop_lat,zone_id,stop_url,location_type,parent_station,stop_timezone,level_id,wheelchair_boarding,platform_code) FROM 'gtfs/stops.txt' DELIMITER ',' CSV HEADER;

COPY transfers (
  from_stop_id, to_stop_id, transfer_type, 
  min_transfer_time
) FROM 'gtfs/transfers.txt' DELIMITER ',' CSV HEADER;

COPY  stop_times (trip_id,arrival_time,departure_time,stop_id,stop_sequence,pickup_type,drop_off_type,local_zone_id,stop_headsign,timepoint) FROM 'gtfs/stop_times.txt' DELIMITER ',' CSV HEADER;
COPY routes FROM 'gtfs/routes.txt' DELIMITER ',' CSV HEADER;
COPY trips FROM 'gtfs/trips.txt' DELIMITER ',' CSV HEADER;
COPY agency FROM 'gtfs/agency.txt' DELIMITER ',' CSV HEADER;
COPY pathways FROM 'gtfs/pathways.txt' DELIMITER ',' CSV HEADER;

select * from routes;
select count(*) from stops;
select * from transfers;
select * from trips;
select * from stop_times;

CREATE INDEX trips_stops_idx ON stop_times (trip_id, stop_id);

SELECT 
  indexname, 
  indexdef 
FROM 
  pg_indexes 
WHERE 
  tablename = 'stop_times';

SELECT 
  s1.stop_name AS departure, 
  s2.stop_name AS arrival, 
  s1.stop_lat AS depLat, 
  s1.stop_lon AS depLon, 
  s2.stop_lat AS arrLat, 
  s2.stop_lon AS arrLon, 
  t.min_transfer_time 
FROM 
  stops AS s1, 
  stops AS s2, 
  transfers AS t 
WHERE 
  --s1.stop_name ILIKE 'châtelet'
  s1.stop_id = t.from_stop_id 
  AND s2.stop_id = t.to_stop_id;

-- SELECTIONNE LE PLUS GRAND TRIP D'UNE STATION ${stopId}
SELECT 
  s.stop_id, 
  st.trip_id, 
  s.stop_name, 
  s.stop_lat, 
  s.stop_lon, 
  st.departure_time, 
  st.stop_sequence, 
  s2.stop_id as transfer_stop_id, 
  s2.stop_lat as transfer_stop_lat, 
  s2.stop_lon as transfer_stop_lon 
FROM 
  stop_times AS st, 
  stops AS s 
  LEFT JOIN transfers AS f ON s.stop_id = f.from_stop_id 
  LEFT JOIN stops as s2 on f.to_stop_id = s2.stop_id, 
  (
    SELECT 
      _st.stop_id, 
      _st.trip_id, 
      count_stops 
    FROM 
      stops AS _s, 
      stop_times AS _st, 
      (
        SELECT 
          count(st.stop_id) as count_stops, 
          st.trip_id 
        FROM 
          (
            SELECT 
              trip_id 
            FROM 
              stop_times as st 
            WHERE 
              st.stop_id = 1636 
            GROUP BY 
              trip_id
          ) AS sub, 
          stop_times as st 
        WHERE 
          st.trip_id = sub.trip_id 
        GROUP BY 
          st.trip_id 
        ORDER BY 
          count_stops DESC 
        LIMIT 
          1
      ) AS sub 
    WHERE 
      _s.stop_id = _st.stop_id 
      AND _s.stop_id = 1636 
      AND sub.trip_id = _st.trip_id
  ) AS sub 
WHERE 
  st.trip_id = sub.trip_id 
  AND st.stop_id = s.stop_id 
ORDER BY 
  stop_sequence;

select 
  st.trip_id, 
  s.stop_id, 
  s.stop_name, 
  s.stop_desc, 
  stop_lat, 
  stop_lon, 
  cts, 
  st.stop_sequence, 
  st.departure_time 
FROM 
  (
    SELECT 
      min(st2.trip_id) as trip_id, 
      st2.departure_time, 
      min(st2.stop_id) as stop_id, 
      st.cts 
    from 
      (
        SELECT 
          st.stop_id, 
          cts, 
          min(st.departure_time) as departure_time 
        FROM 
          stop_times as st, 
          (
            SELECT 
              trip_id, 
              count(stop_id) as cts 
            FROM 
              stop_times 
            GROUP BY 
              trip_id 
            HAVING 
              (
                substring(
                  min(departure_time), 
                  1, 
                  2
                ):: int >= EXTRACT(
                  HOUR 
                  FROM 
                    NOW()
                ) 
                AND substring(
                  min(departure_time), 
                  4, 
                  2
                ):: int >= EXTRACT(
                  MINUTE 
                  FROM 
                    NOW()
                )
              )
          ) as sub 
        WHERE 
          st.trip_id = sub.trip_id --  AND st.stop_id = 1636
        GROUP BY 
          st.stop_id, 
          cts
      ) as sub, 
      (
        SELECT 
          trip_id, 
          count(stop_id) as cts, 
          min(departure_time) as departure_time 
        FROM 
          stop_times 
        GROUP BY 
          trip_id 
        HAVING 
          (
            substring(
              min(departure_time), 
              1, 
              2
            ):: int >= EXTRACT(
              HOUR 
              FROM 
                NOW()
            ) 
            AND substring(
              min(departure_time), 
              4, 
              2
            ):: int >= EXTRACT(
              MINUTE 
              FROM 
                NOW()
            )
          )
      ) as st, 
      stop_times as st2 
    WHERE 
      st.cts = sub.cts 
      and st.trip_id = st2.trip_id 
      and st2.stop_id = sub.stop_id 
      and st2.departure_time = sub.departure_time 
    group by 
      st2.departure_time, 
      st.cts
  ) as sub, 
  stop_times as st, 
  stops as s 
WHERE 
  st.stop_id = sub.stop_id 
  AND s.stop_id = st.stop_id 
  AND st.trip_id = sub.trip_id 
ORDER BY 
  trip_id, 
  st.stop_sequence;

SELECT LOCALTIME(0);
SELECT SUBSTRING('22:12:32', 4, 2):: int;
SELECT EXTRACT(HOUR FROM NOW());
select DATE_TRUNC('minute', now()):: time;

select 
  st.trip_id, 
  s.stop_id, 
  s.stop_name, 
  s.stop_desc, 
  stop_lat, 
  stop_lon, 
  cts, 
  st.stop_sequence, 
  st.departure_time 
FROM 
  (
    SELECT 
      st.stop_id, 
      min(st.trip_id) as trip_id, 
      cts 
    FROM 
      stop_times as st, 
      (
        SELECT 
          trip_id, 
          count(stop_id) as cts 
        FROM 
          stop_times 
        GROUP BY 
          trip_id 
        HAVING 
          (
            substring(
              min(departure_time), 
              1, 
              2
            ):: int >= EXTRACT(
              HOUR 
              FROM 
                NOW()
            ) 
            AND substring(
              min(departure_time), 
              4, 
              2
            ):: int >= EXTRACT(
              MINUTE 
              FROM 
                NOW()
            )
          ) 
        ORDER BY 
          trip_id
      ) as sub 
    WHERE 
      st.trip_id = sub.trip_id 
    GROUP BY 
      st.stop_id, 
      cts 
    order by 
      st.stop_id
  ) as sub, 
  stop_times as st, 
  stops as s 
WHERE 
  st.stop_id = sub.stop_id 
  AND s.stop_id = st.stop_id 
  AND st.trip_id = sub.trip_id 
ORDER BY 
  trip_id, 
  st.stop_sequence

SELECT
	*
FROM
	(
		SELECT
			R.ROUTE_ID,
			R.ROUTE_SHORT_NAME,
			ST.TRIP_ID,
			S.STOP_ID,
			S.STOP_NAME,
			S.STOP_DESC,
			STOP_LAT,
			STOP_LON,
			SOMME,
			ROWNUM,
			ST.STOP_SEQUENCE,
			ST.DEPARTURE_TIME
		FROM
			(
				SELECT
					S2.ROUTE_ID,
					S2.TRIP_ID,
					S2.SOMME,
					ROW_NUMBER() OVER (
						PARTITION BY
							S2.ROUTE_ID
					) AS ROWNUM
				FROM
					(
						SELECT
							SUB.ROUTE_ID,
							MAX(SUB.SOMME) AS SOMME
						FROM
							(
								SELECT
									T.ROUTE_ID,
									ST.TRIP_ID,
									SUM((STOP_SEQUENCE)::INT) AS SOMME
								FROM
									ROUTES AS R
									INNER JOIN TRIPS AS T ON R.ROUTE_ID = T.ROUTE_ID
									INNER JOIN STOP_TIMES AS ST ON ST.TRIP_ID = T.TRIP_ID
								GROUP BY
									T.ROUTE_ID,
									ST.TRIP_ID
								ORDER BY
									T.ROUTE_ID
							) AS SUB
						GROUP BY
							SUB.ROUTE_ID
					) AS S1,
					(
						SELECT
							T.ROUTE_ID,
							ST.TRIP_ID,
							SUM((STOP_SEQUENCE)::INT) AS SOMME
						FROM
							ROUTES AS R
							INNER JOIN TRIPS AS T ON R.ROUTE_ID = T.ROUTE_ID
							INNER JOIN STOP_TIMES AS ST ON ST.TRIP_ID = T.TRIP_ID
						GROUP BY
							T.ROUTE_ID,
							ST.TRIP_ID
						ORDER BY
							T.ROUTE_ID
					) AS S2
				WHERE
					S2.ROUTE_ID = S1.ROUTE_ID
					AND S1.SOMME = S2.SOMME
				GROUP BY
					S2.ROUTE_ID,
					S2.TRIP_ID,
					S2.SOMME
			) AS S3,
			STOP_TIMES AS ST,
			TRIPS AS T,
			STOPS AS S,
			ROUTES AS R
		WHERE
			ROWNUM = 1
			AND S.STOP_ID = ST.STOP_ID
			AND ST.TRIP_ID = S3.TRIP_ID
			AND ST.TRIP_ID = T.TRIP_ID
			AND T.ROUTE_ID = R.ROUTE_ID
		ORDER BY
			R.ROUTE_ID,
			ST.STOP_SEQUENCE
	) AS SS
WHERE
	SS.ROUTE_ID = 'IDFM:C01742';