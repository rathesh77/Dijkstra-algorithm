function httpGetAsync(theUrl, callback, body) {
  var xmlHttp = new XMLHttpRequest()
  xmlHttp.onreadystatechange = function () {
    if (xmlHttp.readyState == 4)
      callback(xmlHttp.responseText)
  }
  xmlHttp.open("GET", theUrl, true)
  xmlHttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')

  xmlHttp.send(null)
}


function updateInput(e, parent) {
  parent.parentNode.previousSibling.previousElementSibling.value = e.target.innerText
  parent.parentNode.innerHTML = ''

}


function formatDuration(seconds) {
  if (seconds == 0)
    return 'maintenant'

  let years = 0, days = 0, hours = 0, minutes = 0, result = ''

  if (seconds >= 31536000) {
    years = parseInt(seconds / 31536000)
    if (years == 1)
      result += `${years} année, `
    else if (years > 1)
      result += `${years} années, `

    seconds = seconds % 31536000
  }

  if (seconds >= 86400) {
    days = parseInt(seconds / 86400)
    if (days == 1)
      result += `${days} jour, `
    else if (days > 1)
      result += `${days} jours, `

    seconds = seconds % 86400
  }

  if (seconds >= 3600) {
    hours = parseInt(seconds / 3600)
    if (hours == 1)
      result += `${hours} heure, `
    else if (hours > 1)
      result += `${hours} heure, `

    seconds = seconds % 3600
  }

  if (seconds >= 60) {
    minutes = parseInt(seconds / 60)
    if (minutes == 1)
      result += `${minutes} minute, `
    else if (minutes > 1)
      result += `${minutes} minutes, `

    seconds = seconds % 60
  }

  if (seconds > 0) {
    if (seconds == 1)
      result += `${seconds} seconde,`
    else
      result += `${seconds} secondes,`
  }

  if (result[result.length - 2] == ',')
    result = result.substring(0, result.length - 2)
  else
    result = result.substring(0, result.length - 1)

  for (let i = result.length - 1; i > 0; i--) {
    if (result[i] == ',') {
      result = result.substring(0, i) + ' et ' + result.substring(i + 2)
      break
    }
  }

  return result
}

function computePath() {
  let departure = document.getElementById('departure_input').value
  let destination = document.getElementById('destination_input').value
  let temp = ''
  for (const char of departure.split('').reverse().join('')) {
    if (char == ' ')
      break
    temp = char + temp
  }
  departure = temp

  temp = ''
  for (const char of destination.split('').reverse().join('')) {
    if (char == ' ')
      break
    temp = char + temp
  }
  destination = temp
  const btnValidate = document.getElementById('btnValidate')
  btnValidate.disabled = true
  if (!departure || !destination) {
    alert("you need to specify a valid departure and destination")
    return
  }
  httpGetAsync(`http://localhost:8080/shortest_path/${departure}/${destination}`, (response) => {
    if (response == '')
      return
    btnValidate.disabled = false
    let res = JSON.parse(response)
    if (!res.distanceTraveled) {
      alert(res.error)
      return
    }

    layerGroup.clearLayers()
    const reducer = (acc, curr) => {
      acc.push([curr.stop_lat, curr.stop_lon])
      return acc
    }
    const latlngs = res.detailedPath.reduce(reducer, [])

    map.fitBounds(latlngs, { minZoom: 10 })

    let currentLine = res.detailedPath[0].route_short_name
    let headTowardDirection = `Prenez <span class='line-name'>${currentLine}</span> en direction de `
    let listStations = ''
    let station = res.detailedPath[0].stop_name
    let finalStr = 'Durée: ' + formatDuration('' + res.distanceTraveled) + '</br>'
    let coords = []
    let line = null
    let colors = ['red', 'orange', 'blue', 'green', 'purple']
    let nthColor = 0
    let previous = station
    res.detailedPath.forEach(element => {
      const { stop_lat, stop_lon, stop_name, stop_desc, route_short_name } = element
      station = stop_name
      const line = route_short_name

      let m = L.marker([stop_lat, stop_lon], { riseOnHover: true }).addTo(layerGroup).bindPopup(`${stop_name}, ${stop_desc}`)
      m.on('mouseover', function (e) {
        this.openPopup()
      })

      if (line == currentLine) {
        listStations = listStations.concat(`<div class='station-name' style='border-left:3px dashed ${colors[nthColor]}'>${stop_name}</div>`)
        coords.push([stop_lat, stop_lon])
      }
      else {
        if (listStations == '')
          listStations = listStations.concat(`<div class='station-name' style='border-left:3px dashed ${colors[nthColor]}'>${previous}</div>`)
        finalStr = finalStr.concat(headTowardDirection.concat(`<b>${previous}</b><ul>`, listStations.concat(`</ul>`)))
        coords.push([stop_lat, stop_lon])
        L.polyline(coords, { color: colors[nthColor], weight: 7, opacity: 1, stroke: true }).addTo(layerGroup)
        nthColor++
        coords = [coords.slice(-1)[0]]
        listStations = ``
        currentLine = line
        headTowardDirection = `Prenez <span class='line-name'>${currentLine}</span> en direction de `
        listStations = listStations.concat(`<div class='station-name' style='border-left:3px dashed ${colors[nthColor]}'>${stop_name}</div>`)
        if (nthColor == colors.length)
          nthColor = 0
      }
      previous = station

    })
    finalStr = finalStr.concat(headTowardDirection.concat(`<b>${station}</b><ul>`, listStations.concat('</ul>')))
    L.polyline(coords, { color: colors[nthColor], weight: 7, opacity: 1, stroke: true }).addTo(layerGroup)
    document.getElementById('path-indicator').innerHTML = finalStr

  })

}
function giveSuggestions(e, ns) {
  Array.from(document.getElementsByClassName('suggestions')).forEach((s) => { s.innerHTML = '' })
  const givenStation = e.target.value.trim()
  const regex = new RegExp(`^${givenStation}.{0,}$`, 'gi')
  let matches = stations.filter((s) => s.stop_name.match(regex))
  if (matches.length && givenStation.length) {
    ns.nextSibling.innerHTML += matches.reduce((acc, curr) => `${acc}\n<li onclick='updateInput(event,this)'>${curr.stop_name} ${(curr.stop_id)}</li>`, '')
  }
}