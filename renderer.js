const fs = require('fs');
const remote = require('electron').remote;
const modifyExif = require('modify-exif');

let images = [];
let imagesPoint = 0;
let imagesCache = [];
let isBGLoading = false;
let limitBGLoad = 10;

const regex = /(.*)\.(jpg|jpeg|bmp|png|gif)+$/gmi;

function showImage() {

    if (imagesCache[imagesPoint] === undefined) {
        document.getElementById("loading").style.display = "block";
        loadImage(imagesPoint).then(res => {
            document.getElementById("loading").style.display = "none";
            document.getElementById("image").style.backgroundImage = "url('data:image/" + res.type + ";base64," + res.base64 + "')";
            document.getElementById("device").innerHTML = res.meta['0th']['272'];
            document.getElementById("date").innerHTML = res.meta['Exif']['36867'];
            backgroundLoad(imagesPoint);
        }).catch(err => {
            console.log(err);
            alert("Ошибка открытия файла");
        });
    } else {
        document.getElementById("image").style.backgroundImage = "url('data:image/" + imagesCache[imagesPoint].type + ";base64," + imagesCache[imagesPoint].base64 + "')";
        document.getElementById("device").innerHTML = imagesCache[imagesPoint].meta['0th']['272'];
        document.getElementById("date").innerHTML = imagesCache[imagesPoint].meta['Exif']['36867'];
    }

    document.querySelector("title").innerText = images[imagesPoint];
}

function backgroundLoad(start) {
    if (!isBGLoading) {
        isBGLoading = true;
        start++;
        if (images[start] !== undefined && imagesCache[start] === undefined) {
            loadImage(start).then(() => {
                rerunBackgroundLoad(start);
            });
        } else {
            rerunBackgroundLoad(start);
        }
    }
}

function rerunBackgroundLoad(start) {
    limitBGLoad--;
    isBGLoading = false;
    if (limitBGLoad > 0) {
        backgroundLoad(start);
    } else {
        limitBGLoad = 10;
    }
}

function loadImage(index) {
    return new Promise((res, rej) => {
        fs.readFile(images[index], (err, data) => {
            if (err) {
                rej(err);
                return;
            }

            const base64 = data.toString('base64');
            let type = images[index].split(".");
            type = type[type.length - 1];
            let meta = {};

            let newfile = modifyExif(data, data => {
                meta = data;
            });

            imagesCache[index] = {type, base64, meta};

            res({type, base64, meta});
        });
    });
}

function Next() {
    imagesPoint++;

    if (imagesPoint > images.length - 1) {
        imagesPoint = 0;
    }
    showImage();
}

function Prev() {
    imagesPoint--;
    if (imagesPoint < 0) {
        imagesPoint = images.length - 1
    }
    showImage();
}

function Delete() {
    if (confirm("Вы точно уверены что хотите удалить файл?")) {
        fs.unlink(images[imagesPoint], (err) => {
            if (err) {
                alert("Невозможно удалить файл");
            }
            images.splice(imagesPoint, 1);
            Next();
        });
    }
}

function showMap() {
    let meta = imagesCache[imagesPoint].meta;
    if (meta.GPS['2'] === undefined) {
        return;
    }
    window.open(`https://yandex.ru/maps/213/moscow/search/${meta.GPS['2'][0][0]}°${meta.GPS['2'][1][0]}.${meta.GPS['2'][2][0]}′N, ${meta.GPS['4'][0][0]}°${meta.GPS['4'][1][0]}.${meta.GPS['4'][2][0]}′E`);
}

/*Читаем папку*/
let items = fs.readdirSync(".");

for (let i = 0; i < items.length; i++) {
    let check = regex.exec(items[i].toString());
    if (check !== null) {
        images.push(items[i]);
    }
}

/*Сортировка*/
images = images.sort();

/*Отображаем файл*/
if (remote.process.argv.length >= 2) {
    let fileShow = remote.process.argv[1].split("\\");
    fileShow = fileShow[fileShow.length - 1];
    for (let i = 0; i < images.length; i++) {
        if (images[i] == fileShow) {
            imagesPoint = i;
        }
    }
}

showImage();

/*Определения горячих кнопок*/
window.addEventListener('keydown', (event) => {
    let code = event.keyCode;
    console.log(code)

    if (code == 39 || code == 190) {
        Next();
    }

    if (code == 37 || code == 188) {
        Prev();
    }

    if (code == 46) {
        Delete();
    }

});

/*Реакция на конопки*/
window.onload = function() {
    document.getElementById("btnNext").addEventListener("click", () => Next());
    document.getElementById("btnPrev").addEventListener("click", () => Prev());
    document.getElementById("btnDelete").addEventListener("click", () => Delete());
    document.getElementById("btnMap").addEventListener("click", () => showMap());
};