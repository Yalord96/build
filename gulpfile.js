import gulp from 'gulp';
import fs from 'fs';
import * as nodePath from 'path';
import notify from 'gulp-notify';
import newer from 'gulp-newer';
import plumber from 'gulp-plumber';
import gulpif from 'gulp-if';
import rename from 'gulp-rename';
import version from 'gulp-version-number';
import webphtml from 'gulp-webp-html-nosvg';
import cleanCSS from 'gulp-clean-css';
import webpcss from 'gulp-webpcss';
import autoprefixer from 'gulp-autoprefixer';
import groupCssMediaQueries from 'gulp-group-css-media-queries';
import webpack from 'webpack-stream';
import webPackConfigProd from './webpack.prod.js';
import TerserPlugin from 'terser-webpack-plugin';
import fonter from 'gulp-fonter-fix';
import ttf2woff2 from 'gulp-ttf2woff2';
import { deleteAsync } from 'del';
import imagemin from 'gulp-imagemin';
import webp from 'gulp-webp';
import { fileURLToPath } from 'url';
import zipPlugin from "gulp-zip";


const rootFolder = nodePath.basename(nodePath.resolve());

const buildFolder = `./dist`;
const srcFolder = `./src`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = nodePath.dirname(__filename);

const path = {
	build: {
		html: `${buildFolder}/`,
		js: `${buildFolder}/js/`,
		css: `${buildFolder}/css/`,
		images: `${buildFolder}/img/`,
		fonts: `${buildFolder}/fonts/`,
		files: `${buildFolder}/files/`
	},
	src: {
		html: `${srcFolder}/*.html`,
		pug: `${srcFolder}/pug/*.pug`,
		js: `${srcFolder}/js/app.js`,
		scss: `${srcFolder}/scss/style.scss`,
		images: `${srcFolder}/img/**/*.{jpg,jpeg,png,gif,webp}`,
		svg: `${srcFolder}/img/**/*.svg`,
		fonts: `${srcFolder}/fonts/*.*`,
		files: `${srcFolder}/files/**/*.*`,
		svgicons: `${srcFolder}/svgicons/*.svg`,
	},
	clean: buildFolder,
	buildFolder: buildFolder,
	rootFolder: rootFolder,
	srcFolder: srcFolder,
	ftp: ``
	// Приклад: завантажити в папку 2022 далі в папку з назвою проєкту
	// ftp: `2022/${rootFolder}`
};


let webPackConfigBeautify = Object.assign({}, webPackConfigProd);

webPackConfigBeautify.optimization = {
	minimizer: [new TerserPlugin({
		extractComments: false,
		terserOptions: {
			ecma: undefined,
			warnings: false,
			parse: {},
			compress: {
				defaults: false,
				unused: true,
			},
			mangle: false,
			module: false,
			toplevel: true,
			keep_classnames: true,
			keep_fnames: true,
			format: {
				beautify: true
			}
		}
	})],
}
webPackConfigBeautify.output = {
	path: __dirname + `${path.buildFolder}`,
	filename: 'app.js',
	publicPath: '/',
}

const configFTP = {
	host: "", // Адреса FTP сервера
	user: "", // Ім'я користувача
	password: "", // Пароль
	parallel: 5 // Кількість одночасних потоків
}

const app = {
	isBuild: process.argv.includes('--build'),
	isDev: !process.argv.includes('--build'),
	isWebP: !process.argv.includes('--nowebp'),
	isFontsReW: process.argv.includes('--rewrite')
}

// ========================================#tasks==================================================
// #HTML
function html() {
  return gulp.src(`${path.build.html}*.html`)
  .pipe(plumber(
    notify.onError({
      title: "HTML",
      message: "Error: <%= error.message %>"
    }))
  )
  .pipe(
    gulpif(
      app.isWebP,
      webphtml()
    )
  )
  .pipe(version({
    'value': '%DT%',
    'append': {
      'key': '_v',
      'cover': 0,
      'to': ['css', 'js', 'img']
    },
    'output': {
      'file': './version.json'
    }
  }))
  .pipe(gulp.dest(path.build.html));
}

// #CSS
function css() {
	return gulp.src(`${path.build.css}style.css`, {})
		.pipe(plumber(
			notify.onError({
				title: "CSS",
				message: "Error: <%= error.message %>"
			})))
		.pipe(
			gulpif(
				app.isBuild,
				groupCssMediaQueries()
			)
		)
		.pipe(
			gulpif(
				app.isBuild,
				autoprefixer({
					grid: true,
					overrideBrowserslist: ["last 3 versions"],
					cascade: true
				})
			)
		)
		.pipe(
			gulpif(
				app.isWebP,
				gulpif(
					app.isBuild,
					webpcss(
						{
							webpClass: ".webp",
							noWebpClass: ".no-webp"
						}
					)
				)
			)
		)
		.pipe(gulp.dest(path.build.css))
		.pipe(
			gulpif(
				app.isBuild,
				cleanCSS()
			)
		)
		.pipe(rename({ suffix: ".min" }))
		.pipe(gulp.dest(path.build.css));
}

// #JS
function jsDev() {
	return gulp.src(path.src.js)
	.pipe(plumber(
		notify.onError({
			title: "JS",
			message: "Error: <%= error.message %>"
		}))
	)
	.pipe(webpack({
		config: webPackConfigBeautify
	}))
	.pipe(gulp.dest(path.build.js));
}

function js() {
	return gulp.src(path.src.js)
	.pipe(plumber(
		notify.onError({
			title: "JS",
			message: "Error: <%= error.message %>"
		}))
	)
	.pipe(webpack({
		config: webPackConfigProd
	}))
	.pipe(gulp.dest(path.build.js));
}

// #RESET
function reset() {
	return deleteAsync(path.clean);
}

// #FONTS
function cb() { }
function otfToTtf() {
	return gulp.src(`${path.srcFolder}/fonts/*.otf`, {})
		.pipe(plumber(
			notify.onError({
				title: "FONTS",
				message: "Error: <%= error.message %>"
			}))
		)
		.pipe(fonter({
			formats: ['ttf']
		}))
		.pipe(gulp.dest(`${path.buildFolder}/fonts/`))
}

function ttfToWoff() {
	return gulp.src(`${path.srcFolder}/fonts/*.ttf`, {})
		.pipe(plumber(
			notify.onError({
				title: "FONTS",
				message: "Error: <%= error.message %>"
			}))
		)
		.pipe(fonter({
			formats: ['woff']
		}))
		.pipe(gulp.dest(`${path.build.fonts}`))
		.pipe(gulp.src(`${path.src}/fonts/*.ttf`))
		.pipe(ttf2woff2())
		.pipe(gulp.dest(`${path.build.fonts}`))
		.pipe(gulp.src(`${path.srcFolder}/fonts/*.{woff,woff2}`))
		.pipe(gulp.dest(`${path.build.fonts}`));
}

function fonstStyle() {
	let fontsFile = `${path.srcFolder}/scss/fonts/fonts.scss`;
	app.isFontsReW ? fs.unlink(fontsFile, cb) : null;
	fs.readdir(path.build.fonts, function (err, fontsFiles) {
		if (fontsFiles) {
			if (!fs.existsSync(fontsFile)) {
				fs.writeFile(fontsFile, '', cb);
				let newFileOnly;
				for (var i = 0; i < fontsFiles.length; i++) {
					let fontFileName = fontsFiles[i].split('.')[0];
					if (newFileOnly !== fontFileName) {
						let fontName = fontFileName.split('-')[0] ? fontFileName.split('-')[0] : fontFileName;
						let fontWeight = fontFileName.split('-')[1] ? fontFileName.split('-')[1] : fontFileName;
						if (fontWeight.toLowerCase() === 'thin') {
							fontWeight = 100;
						} else if (fontWeight.toLowerCase() === 'extralight') {
							fontWeight = 200;
						} else if (fontWeight.toLowerCase() === 'light') {
							fontWeight = 300;
						} else if (fontWeight.toLowerCase() === 'medium') {
							fontWeight = 500;
						} else if (fontWeight.toLowerCase() === 'semibold') {
							fontWeight = 600;
						} else if (fontWeight.toLowerCase() === 'bold') {
							fontWeight = 700;
						} else if (fontWeight.toLowerCase() === 'extrabold' || fontWeight.toLowerCase() === 'heavy') {
							fontWeight = 800;
						} else if (fontWeight.toLowerCase() === 'black') {
							fontWeight = 900;
						} else {
							fontWeight = 400;
						}
						fs.appendFile(fontsFile, `@font-face {\n\tfont-family: ${fontName};\n\tfont-display: swap;\n\tsrc: url("../fonts/${fontFileName}.woff2") format("woff2"), url("../fonts/${fontFileName}.woff") format("woff");\n\tfont-weight: ${fontWeight};\n\tfont-style: normal;\n}\r\n`, cb);
						newFileOnly = fontFileName;
					}
				}
			} else {
				console.log("The scss/fonts/fonts.scss file already exists. To update the file, you need to delete it!");

			}
		} else {
			fs.unlink(fontsFile, cb)
		}
	});
	return gulp.src(`${path.srcFolder}`);
}

// #IMG
function img() {
	return gulp.src(path.src.images)
		.pipe(plumber(
			notify.onError({
				title: "IMAGES",
				message: "Error: <%= error.message %>"
			}))
		)
		.pipe(newer(path.build.images))
		.pipe(
			gulpif(
				app.isWebP,
				webp({
					quality: 100
				})
			)
		)
		.pipe(
			gulpif(
				app.isWebP,
				gulp.dest(path.build.images)
			)
		)
		.pipe(
			gulpif(
				app.isWebP,
				gulp.src(path.src.images)
			)
		)
		.pipe(
			gulpif(
				app.isWebP,
				newer(path.build.images)
			)
		)
		.pipe(imagemin({
			progressive: true,
			svgoPlugins: [{ removeViewBox: false }],
			interlaced: true,
			optimizationLevel: 3 // 0 to 7
		}))
		.pipe(gulp.dest(path.build.images))
		.pipe(gulp.src(path.src.svg))
		.pipe(gulp.dest(path.build.images));
}

// #gitignore
function gitignore() {
	if (!fs.existsSync('.gitignore')) {
		fs.writeFile('./.gitignore', '', cb);
		fs.appendFile('./.gitignore', 'package-lock.json\r\n', cb);
		fs.appendFile('./.gitignore', 'node_modules/\r\n', cb);
		fs.appendFile('./.gitignore', '.gitignore\r\n', cb);
		fs.appendFile('./.gitignore', 'dist/\r\n', cb);
		fs.appendFile('./.gitignore', 'version.json\r\n', cb);
		fs.appendFile('./.gitignore', buildFolder + '\r\n', cb);
		fs.appendFile('./.gitignore', '**/*.zip\r\n', cb);
		fs.appendFile('./.gitignore', '**/*.rar\r\n', cb);
		fs.appendFile('./.gitignore', '.vscode\r\n', cb);
		fs.appendFile('./.gitignore', '.idea\r\n', cb);
		fs.appendFile('./.gitignore', '.DS_Store\r\n', cb);
	}
	return gulp.src(`${path.srcFolder}`);
}

// #ZIP
function zip() {
	deleteAsync(`./${path.rootFolder}.zip`);
	return gulp.src(`${path.buildFolder}/**/*.*`, {})
		.pipe(plumber(
			notify.onError({
				title: "ZIP",
				message: "Error: <%= error.message %>"
			}))
		)
		.pipe(zipPlugin(`${path.rootFolder}.zip`))
		.pipe(gulp.dest('./'));
}
// ========================================#exports==================================================

const fonts = gulp.series(reset, otfToTtf, ttfToWoff, fonstStyle);
// const devTasks = gulp.parallel(fonts, gitignore);
const devTasks = fonts;
const buildTasks = gulp.series(fonts, jsDev, js, gulp.parallel(html, css, img));

const development = gulp.series(devTasks);
const build = gulp.series(buildTasks);
// const deployFTP = gulp.series(buildTasks, ftp);
const deployZIP = gulp.series(buildTasks, zip);


export { development, build , deployZIP};

export default development;