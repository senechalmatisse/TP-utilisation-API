"use strict";

let map = null;
let allMarkers = [];

function init() {
    const formulaire = document.getElementById("recherche");
    formulaire.addEventListener("submit", (event) => {
        event.preventDefault();
        recherche();
    });

    const carte = document.getElementById("carte");
    map = L.map(carte).setView([0, 0], 2);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
}

function recherche() {
    let motsCles = document.getElementById("mots").value.trim();
    const erreurElement = document.getElementById("erreur");
    erreurElement.textContent = "";

    if (motsCles === "") {
        erreurElement.textContent = "Veuillez entrer des mots-clés valides.";
        return;
    }

    let url = `https://www.flickr.com/services/rest/?method=flickr.photos.search&api_key=951aedc8ed0d7686ae7df679d7d5d5b0&text=${motsCles}&format=json&nojsoncallback=1&has_geo=1`;
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);

    xhr.onload = () => {
        if (xhr.status === 200) {
            afficheReponse(xhr.responseText);
        } else {
            console.error("Erreur lors de la requête Flickr.");
        }
    };
    xhr.send();
}

function afficheReponse(response) {
    const erreurElement = document.getElementById("erreur");
    const resultatsElement = document.getElementById("resultats");
    const detailsElement = document.getElementById("details");

    erreurElement.textContent = "";
    resultatsElement.innerHTML = "";
    detailsElement.innerHTML = "";

    let reponse = JSON.parse(response);

    if (reponse.stat === "fail") {
        erreurElement.textContent = reponse.message;
    } else {
        let photos = reponse.photos.photo.slice(0, 20); // Limitez à 20 photos

        if (photos.length === 0) {
            resultatsElement.textContent = "Aucun résultat trouvé.";
        } else {
            photos.forEach((photo) => {
                let imageUrl = `https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_s.jpg`;
                let imageTitle = photo.title;

                const imageElement = document.createElement("img");
                imageElement.src = imageUrl;
                imageElement.alt = imageTitle;
                imageElement.title = imageTitle;

                imageElement.addEventListener("click", () => {
                    getDetails(photo.id);
                });

                resultatsElement.appendChild(imageElement);
            });
        }
    }
}

function getDetails(photoId) {
    let url = `https://www.flickr.com/services/rest/?method=flickr.photos.getInfo&api_key=951aedc8ed0d7686ae7df679d7d5d5b0&photo_id=${photoId}&format=json&nojsoncallback=1`;
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);

    xhr.onload = () => {
        if (xhr.status === 200) {
            afficheDetails(JSON.parse(xhr.responseText));
        } else {
            console.error("Erreur lors de la requête Flickr pour les détails de l'image.");
        }
    };

    xhr.send();
}

function afficheDetails(details) {
    const sectionDetails = document.getElementById("details");
    // Efface tout le contenu précédent dans la section "details"
    sectionDetails.innerHTML = "";
    let photo = details.photo;

    const elementTitre = document.createElement("h2");
    elementTitre.textContent = photo.title._content;

    const elementDescription = document.createElement("p");
    elementDescription.textContent = photo.description._content;

    // Balise <figure> pour afficher l'image et ses détails
    const elementFigure = document.createElement("figure");
    const elementImage = document.createElement("img");
    const elementLegende = document.createElement("figcaption");
    const lienProprietaire = document.createElement("a");

    elementImage.src = `https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`;
    elementImage.alt = photo.title._content;
    elementImage.width = 1024;

    // Formate la date au format "YYYY-MM-DD HH:MM:SS"
    const elementDatePrise = document.createElement("p");
    let datePrise = new Date(photo.dates.posted * 1000);
    let dateFormatee = datePrise.toISOString().slice(0, 19).replace("T", " ");
    elementDatePrise.textContent = `Photo prise le : ${dateFormatee} par `;

    // Créer un lien autour du nom du propriétaire pour renvoyer à son profil sur Flickr
    lienProprietaire.href = `https://www.flickr.com/photos/${photo.owner.nsid}/`;
    lienProprietaire.textContent = photo.owner.username;

    // Ajoute tous les éléments au figcaption
    elementDatePrise.appendChild(lienProprietaire);
    elementLegende.appendChild(elementDatePrise);

    // Ajoute tous les éléments à la figure
    elementFigure.appendChild(elementImage);
    elementFigure.appendChild(elementLegende);

    // Ajoute tous les éléments à la section details
    sectionDetails.appendChild(elementTitre);
    sectionDetails.appendChild(elementDescription);
    sectionDetails.appendChild(elementFigure);

    // ---------------------------------------------------- 2ème partie --------------------------------------------------------------------

    // Efface tous les marqueurs précédents de la carte
    for (const marker of allMarkers) {
        map.removeLayer(marker);
    }
    allMarkers = [];

    // Vérifie si la géolocalisation est disponible
    if (photo.location && photo.location.latitude && photo.location.longitude) {
        const latitude = parseFloat(photo.location.latitude);
        const longitude = parseFloat(photo.location.longitude);

        const url = `https://www.flickr.com/services/rest/?method=flickr.photos.search&api_key=951aedc8ed0d7686ae7df679d7d5d5b0&format=json&nojsoncallback=1&has_geo=1&lat=${latitude}&lon=${longitude}&radius=2&per_page=20&extras=geo,description`;

        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);

        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.stat === "ok") {
                    const photos = response.photos.photo;

                    for (const photo of photos) {
                        const latitude = parseFloat(photo.latitude);
                        const longitude = parseFloat(photo.longitude);

                        // Créez un marqueur pour chaque image géolocalisée
                        const imagePopupContent = `
                            <p><strong>${photo.title}</strong></p>
                            <figure>
                                <img src="https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_q.jpg" width="75" height="75">
                                <figcaption>${photo.description._content}</figcaption>
                            </figure>
                            <p><a href="https://www.flickr.com/photos/${photo.owner}/${photo.id}/" target="_blank">Voir chez Flickr</a></p>
                        `;

                        const marker = L.marker([latitude, longitude]).addTo(map);
                        marker.bindPopup(imagePopupContent);

                        // Ouvrir automatiquement le popup du marqueur
                        marker.openPopup();

                        allMarkers.push(marker);
                    }

                    // Centrez la carte sur le premier marqueur avec un zoom de 10
                    if (photos.length > 0) {
                        map.setView([photos[0].latitude, photos[0].longitude], 10);
                    }
                }
            } else {
                console.error("Erreur lors de la requête Flickr pour les images géolocalisées.");
            }
        };

        xhr.send();
    } else {
        // Sinon, on affiche un message
        sectionDetails.textContent = "Géolocalisation non disponible pour cette image.";
    }
};    

function formatDate(timestamp) {
    if (timestamp === 0) {
        return "Date non disponible";
    }

    let date = new Date(timestamp);
    let year = date.getFullYear();
    let month = (date.getMonth() + 1).toString().padStart(2, "0");
    let day = date.getDate().toString().padStart(2, "0");
    let hours = date.getHours().toString().padStart(2, "0");
    let minutes = date.getMinutes().toString().padStart(2, "0");
    let seconds = date.getSeconds().toString().padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}