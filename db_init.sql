drop 
  index if exists trips_stops_idx;
drop 
  table if exists stops CASCADE;
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
CREATE TABLE stops (
  stop_id VARCHAR(256) PRIMARY KEY, 
  stop_code VARCHAR(256), 
  stop_name VARCHAR(256), 
  stop_desc VARCHAR(256), 
  stop_lat VARCHAR(256), 
  stop_lon VARCHAR(256), 
  zone_id  VARCHAR(256),
  stop_url VARCHAR(256),
  location_type VARCHAR(256), 
  parent_station VARCHAR(256),
  stop_timezone VARCHAR(256),
  level_id VARCHAR(256),
  wheelchair_boarding VARCHAR(256),
  platform_code VARCHAR(256)


);
CREATE TABLE transfers (
  id serial PRIMARY KEY, from_stop_id VARCHAR(256), 
  to_stop_id VARCHAR(256), transfer_type VARCHAR(256), 
  min_transfer_time VARCHAR(256)
);
CREATE TABLE stop_times (
  id serial PRIMARY KEY,
  trip_id VARCHAR(256), 
  arrival_time TEXT, 
  departure_time TEXT, 
  stop_id VARCHAR(256), 
  stop_sequence VARCHAR(256), 
  stop_headsign VARCHAR(256), 
  pickup_type VARCHAR(256),
  drop_off_type VARCHAR(256),
  local_zone_id VARCHAR(256),
  timepoint VARCHAR(256)
);
CREATE TABLE trips (
  route_id VARCHAR(256), 
  service_id VARCHAR(256), 
  trip_id VARCHAR(256), 
  trip_headsign VARCHAR(256), 
  trip_short_name VARCHAR(256), 
  direction_id VARCHAR(256), 
  shape_id VARCHAR(256),
  block_id VARCHAR(256),
  wheelchair_accessible VARCHAR(256),
  bikes_allowed VARCHAR(256)
);
CREATE TABLE routes (
  route_id VARCHAR(256), 
  agency_id VARCHAR(256), 
  route_short_name VARCHAR(256), 
  route_long_name VARCHAR(256), 
  route_desc VARCHAR(256), 
  route_type SMALLINT, 
  route_url VARCHAR(256), 
  route_color VARCHAR(256), 
  route_text_color VARCHAR(256),
  route_sort_order VARCHAR(256)
);
COPY stops (stop_id,stop_code,stop_name,stop_desc,stop_lon,stop_lat,zone_id,stop_url,location_type,parent_station,stop_timezone,level_id,wheelchair_boarding,platform_code) FROM 'gtfs/stops.txt' DELIMITER ',' CSV HEADER;

COPY transfers (
  from_stop_id, to_stop_id, transfer_type, 
  min_transfer_time
) FROM 'gtfs/transfers.txt' DELIMITER ',' CSV HEADER;

COPY  stop_times (trip_id,arrival_time,departure_time,stop_id,stop_sequence,pickup_type,drop_off_type,local_zone_id,stop_headsign,timepoint) FROM 'gtfs/stop_times.txt' DELIMITER ',' CSV HEADER;
COPY routes FROM 'gtfs/routes.txt' DELIMITER ',' CSV HEADER;
COPY trips FROM 'gtfs/trips.txt' DELIMITER ',' CSV HEADER;

select * from routes;
select count(*) from stops;
select * from transfers;
select * from trips;
select * from stop_times;

CREATE UNIQUE INDEX trips_stops_idx ON stop_times (trip_id, stop_id);

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