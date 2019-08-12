<!-- DOM Tag Name-->
<svelte:options tag="jse-overlap"/>
<!-- xDOM Tag Name-->

<!-- JSE Overlap -->
<!-- 
-->
<div id="JSE-overlap" on:mouseout="{mout}" on:mousemove="{mmove}" on:mouseup="{dragEnd}">
	<div id="JSE-top" style="width:{x}px; background-image:url({top})">
		<div id="JSE-dragIco" on:mousedown="{dragStart}"></div>
	</div>
	<div id="JSE-bottom" style="background-image:url({bottom})"></div>
</div>
<!-- xJSE Overlap -->




<script>
	//libs
	//import { onMount, createEventDispatcher } from 'svelte';
	import { spring } from 'svelte/motion';
	
	//Props
	export let top = 'images/1.png';
	export let bottom = 'images/2.png';
	export let url = 'https://jsecoin.com';

	let enableDrag = false;
	let mouseUp = true;
	let x= 150;
	let clickPos = 0;
	let rect = '';
	
	const dragStart = (e) => {
		enableDrag = true;
		mouseUp = false;
		clickPos = e.pageX - rect.left;
	};
	const dragEnd = (e) => {
		enableDrag = false;
		mouseUp = true;
		//console.log(clickPos, (e.pageX - rect.left));
		if (clickPos === (e.pageX - rect.left)) {
			window.location = url;
		}
	};
	const mmove = (e) => {
		//console.log(enableDrag,mouseUp);
		rect = e.currentTarget.getBoundingClientRect();
		if (!mouseUp) {
			const mouseX = e.pageX - rect.left;
			const mouseY = e.pageY - rect.top;
			x = mouseX;
			if ((x <0) && (enableDrag)) {
				enableDrag = false;
				x = 0;
			}
			if ((x > 300) && (enableDrag)) {
				enableDrag = false;
				x = 300;
			}
		}
	};
	const mout = (e) => {
		if (!mouseUp) {
			if ((x < 10) && (enableDrag)) {
				enableDrag = false;
				x = 0;
			}
			if ((x > 290) && (enableDrag)) {
				enableDrag = false;
				x = 300;
			}
		}
	};
</script>




<!-- IMPORTANT When developing add global attribute -->
<style>

#JSE-overlap,
#JSE-overlap * {
	-webkit-app-region: no-drag;
}
#JSE-overlap {
	width:300px;
	height:250px;
	position: relative;
	overflow: hidden;
	background:#000;
}

#JSE-top::before, 
#JSE-top::after {
    display: block;
    content: "";
    position: absolute;
    height: calc(50% - 14px);
    width: 2px;
    background: #fff;
}

#JSE-top::before {
    top: 0;
    right: 0;
}

#JSE-top::after {
    bottom: 0;
    right: 0;
}

#JSE-top { 
	/*width:150px !important;*/
	z-index:10;
	/*background:blue;*/
	-webkit-animation: attentionGetter 1s;
  	animation: attentionGetter 1s;
}

#JSE-bottom {
	/*background:red;*/
}

#JSE-top,
#JSE-bottom {
	position: absolute;
    width: 300px;
    height: 250px;
	background-size: 300px 250px;
}

#JSE-dragIco {
	display: block;
    position: absolute;
    top: 50%;
    right: -15px;
    height: 28px;
    width: 28px;
    transform: translate(0, -50%);
    border: 2px solid #fff;
    border-radius: 100%;
	background-size: 50%;
	background-repeat: no-repeat;
	background-position: center;
	background-color: rgba(0,0,0,0);
  	background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMzcgMzAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDM3IDMwOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PHN0eWxlIHR5cGU9InRleHQvY3NzIj4uc3Qwe2ZpbGw6I0ZGRkZGRjtzdHJva2U6I0ZGRkZGRjtzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmQ7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fTwvc3R5bGU+PHBvbHlnb24gY2xhc3M9InN0MCIgcG9pbnRzPSIxNS40LDI5LjQgMSwxNSAxNS40LDAuNiAiLz48cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjIxLjIsMC42IDM1LjYsMTUgMjEuMiwyOS40ICIvPjwvc3ZnPg==);
	cursor: pointer;
	transition: background 0.2s;
}

#JSE-dragIco:hover {
	background-color: rgba(0,0,0,0.4);
}

@-webkit-keyframes attentionGetter {
  0% {
    width: 75px;
  }
  55% {
    width: 175px;
  }
  80% {
    width: 10px;
  }
  100% {
    width: 150px;
  }
}
@keyframes attentionGetter {
  0% {
    width: 75px;
  }
  55% {
    width: 175px;
  }
  80% {
    width: 10px;
  }
  100% {
    width: 150px;
  }
}
</style>
