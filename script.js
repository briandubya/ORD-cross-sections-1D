let currentGraphIndex = 0;
let graphData = {};
let csvData = '';

document.getElementById('convertButton').addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const riverName = document.getElementById('riverInput').value;
    const reach = document.getElementById('reachInput').value;

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const xml = e.target.result;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, "text/xml");
            graphData = xmlToData(xmlDoc);
            csvData = generateCsv(graphData, riverName, reach);
            displayGraph(Object.keys(graphData)[0]);
            populateGraphSelect(graphData);
            document.getElementById('downloadCsvButton').style.display = 'block';
        };
        reader.readAsText(file);
    }
});

document.getElementById('downloadCsvButton').addEventListener('click', () => {
    downloadCsv(csvData);
});

document.getElementById('prevGraph').addEventListener('click', () => {
    navigateGraph(-1);
});

document.getElementById('nextGraph').addEventListener('click', () => {
    navigateGraph(1);
});

document.getElementById('graphSelect').addEventListener('change', (e) => {
    displayGraph(e.target.value);
});

document.getElementById('searchGraph').addEventListener('input', (e) => {
    searchGraph(e.target.value);
});

function xmlToData(xmlDoc) {
    let data = {};

    const stations = xmlDoc.getElementsByTagName('CrossSectionStation');
    for (const station of stations) {
        const namedBoundary = station.getAttribute('namedBoundary');
        data[namedBoundary] = [];

        const surfaces = station.getElementsByTagName('CrossSectionSurface');
        for (const surface of surfaces) {
            // console.log(surface.getAttribute('name'))
            if (surface.getAttribute('name')){
                const points = surface.getElementsByTagName('CrossSectionPoint');
            
                for (const point of points) {
                    const elevation = point.getAttribute('elevation');
                    const offset = point.getAttribute('offset');
                    const northing = point.getAttribute('northing')
                    const easting = point.getAttribute('easting')
                    data[namedBoundary].push({ elevation, offset, northing, easting });
                }
            }
        }
    }
    return data;
}

function displayGraph(boundary) {
    const canvas = document.createElement('canvas');
    const graphContainer = document.getElementById('graphContainer');
    graphContainer.innerHTML = '';
    graphContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    const chartData = {
        labels: graphData[boundary].map(point => point.offset),
        datasets: [{
            label: `Station ${boundary}`,
            data: graphData[boundary].map(point => point.elevation),
            fill: false,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
        }]
    };

    new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Offset (m)'
                    }
                },
                y: { 
                    beginAtZero: false, 
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Elevation (m AOD)'
                    }
                    }
            }
        }
    });

    currentGraphIndex = Object.keys(graphData).indexOf(boundary);
    document.getElementById('graphSelect').value = boundary;
}

function generateCsv(data, riverName, reach) {
    let csv = 'River,Reach,Corridor Section,Index,Reverse Index,Easting,Northing,Offset,Elevation\n';

    let boundaryIndex = 1; // Unique index for each namedBoundary
    const totalBoundaries = Object.keys(data).length; // Total number of unique namedBoundaries
    const boundaryIndexMap = {}; // Map to store index for each namedBoundary

    for (const boundary in data) {
        boundaryIndexMap[boundary] = boundaryIndex; // Assign a unique index to the namedBoundary
        const reverseIndex = totalBoundaries - boundaryIndex; // Calculate the reverse index

        data[boundary].forEach(point => {
            // Use the same unique index and reverse index for all points in the same namedBoundary
            csv += `${riverName},${reach},${boundary},${boundaryIndex},${reverseIndex},${point.easting},${point.northing},${point.offset},${point.elevation}\n`;
        });

        boundaryIndex++; // Increment for the next namedBoundary
    }

    return csv;
}


function downloadCsv(csv) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function navigateGraph(step) {
    const boundaries = Object.keys(graphData);
    currentGraphIndex = (currentGraphIndex + step + boundaries.length) % boundaries.length;
    displayGraph(boundaries[currentGraphIndex]);
}

function populateGraphSelect(data) {
    const select = document.getElementById('graphSelect');
    select.innerHTML = '';

    Object.keys(data).forEach(boundary => {
        const option = document.createElement('option');
        option.value = boundary;
        option.textContent = boundary;
        select.appendChild(option);
    });
}

function searchGraph(searchTerm) {
    const boundaries = Object.keys(graphData).filter(boundary => 
        boundary.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (boundaries.length > 0) {
        displayGraph(boundaries[0]);
    }
}