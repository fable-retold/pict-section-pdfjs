const libPictViewClass = require('pict-view');

const default_configuration =
{
	"RenderOnLoad": true,
	"DefaultRenderable": "PDFJS-Wrap",
	"DefaultDestinationAddress": "#PDFJS-Container-Div",
	"ViewAddress": 'PictSectionPDFJS',
	"theme": "dark",
	"styles": /*css*/``,
    "pdfUrl": "",
    "pdfjsPath": "./pdfjs-dist",
	"Templates": [
		{
			"Hash": "PDFJS-Container",
			"Template": /*html*/`
				<div id="pdfjs-info-banner" class="pdfjs-banner-container">
				</div>
                <div id="pdfjs-injectable" class="injectable-size">
                </div>
                <style>
                    .injectable-size {
                        height: 100%;
                    }
					.pdfjs-info-banner {
						display: inline-block;
						font-family: sans-serif;
						font-size: 1rem;
						align-content: center;
						padding-left: 10px;
						line-height: 100%;
						height: 30px;
						color: hsl(221deg, 14%, 29%);
					}
					.pdfjs-banner-close {
						display: inline-block;
						align-content: center;
						padding-right: 10px;
						line-height: 100%;
						height: 30px;
						font-weight: bold;
						cursor: pointer;
						color: hsl(221deg, 14%, 29%);
					}
					.pdfjs-banner-container {
						display: flex;
						background-color: hsl(45deg, 100%, 48%);
						width: 100%;
						justify-content: space-between;
					}
                </style>
			`
		}
	],

	"Renderables": [
		{
			"RenderableHash": "PDFJS-Wrap",
			"TemplateHash": "PDFJS-Container",
			"DestinationAddress": "#PDFJS-Container-Div",
			"RenderType": "replace"
		}
	],

	"TargetElementAddress": "#PDFJS-Container-Div"
}

class PictSectionPDFJS extends libPictViewClass
{
	constructor(pFable, pOptions, pServiceHash)
	{
		let tmpOptions = Object.assign({}, default_configuration, pOptions);

		super(pFable, tmpOptions, pServiceHash);
	}

	onBeforeInitialize()
	{
		this.pdfjsInstance = {};
		super.onBeforeInitialize();
	}

	onAfterRender(pRenderable)
	{
		super.onAfterRender(pRenderable);
		const viewerEl = /*html*/`<pdfjs-viewer-element
                                    class="injectable-size"
                                    src="${ this.options.pdfUrl }"
                                    viewer-path="${ this.options.pdfjsPath }"
									viewer-css-theme="${ this.options?.theme?.toUpperCase() || 'DARK' }"
									viewer-extra-styles="${ this.options?.styles }
															#editorStampButton {
																display: none;
															}
															#editorInkButton {
																display: none;
															}
															#editorFreeTextButton {
																display: none;
															}
															#editorHighlightButton {
																display: none;
															}
														"
									>
                                </pdfjs-viewer-element>`;
        this.pict.ContentAssignment.assignContent(`${ this.options?.DefaultDestinationAddress } > #pdfjs-injectable`, viewerEl);

		// Waits for the pdfjs lib to instantiate itself before checking if it should show the info banner and setting a local instance reference.
		let timer = 0;
		const setpdfjsReference = () =>
		{
			const pdfjsObj = document.querySelector('pdfjs-viewer-element')?.shadowRoot?.querySelector('iframe')?.contentWindow?.PDFViewerApplication;
			if (pdfjsObj && pdfjsObj?.pdfDocument)
			{
				const bannerInjectionEl = document.querySelector('#pdfjs-info-banner');
				if (bannerInjectionEl)
				{
					bannerInjectionEl.innerHTML = '';
				}
				this.pdfjsInstance = pdfjsObj;
				this.getStartingPageLabel().then((page) =>
				{
					if (page !== 1)
					{
						if (bannerInjectionEl)
						{
							bannerInjectionEl.innerHTML = this.options?.pageInfoTemplate ? this.options.pageInfoTemplate : /*html*/`
								<div class="pdfjs-info-banner">
									Note: This pdf does not start on page 1.
								</div>
								<div class="pdfjs-banner-close" onclick="
									if (document.querySelector('#pdfjs-info-banner')?.innerHTML)
									{
										document.querySelector('#pdfjs-info-banner').innerHTML = '';
									}
								">&times;</div>
							`;
						}
					}
				});
			}
			else if (timer < 30)
			{
				timer += 1;
				setTimeout(setpdfjsReference, 100);
			}
		}
		setpdfjsReference();
	}

	/*
		Gets the current active page of the pdf viewer.
		This is the "absolute" page number rather than being based on altered numbering in the page labels metadata.
	*/
	getCurrentPage()
	{
		return this.pdfjsInstance?.page || 1;
	}

	/*
		Sets the current active page of the pdf viewer.
		This is the "absolute" page number rather than being based on altered numbering in the page labels metadata.
	*/
	setCurrentPage(pageNumber)
	{
		if (!this.pdfjsInstance?.page)
		{
			return;
		}
		this.pdfjsInstance.page = pageNumber;
	}

	/*
		Gets the current active page of the pdf viewer.
		This is the "relative" page number, i.e. defined by the pdfs metadata rather than the absolute number of pages.
		Note that this function is async.
	*/
	async getCurrentPageLabel()
	{
		const labels = await this.pdfjsInstance?.pdfDocument?.getPageLabels();
		const currentPage = this.getCurrentPage();
		if (!labels || !currentPage)
		{
			return currentPage;
		}
		else
		{
			// If the page is not parseable as a number, just return the string (example: pages labeled with roman numerals, like "ii").
			return Number(labels[this.getCurrentPage() - 1]) || labels[this.getCurrentPage() - 1];
		}
	}

	/*
		Gets the first page number of the pdf with whatever relative/offset label it may have.
		Note that this function is also async.
	*/
	async getStartingPageLabel()
	{
		const labels = await this.pdfjsInstance?.pdfDocument?.getPageLabels();
		if (!labels)
		{
			return 1;
		}
		else
		{
			// If the page is not parseable as a number, just return the string (example: pages labeled with roman numerals, like "ii").
			return Number(labels[0]) || labels[0];
		}
	}
}

module.exports = PictSectionPDFJS;
module.exports.default_configuration = default_configuration;

