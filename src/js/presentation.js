import { annotate } from '../vendor/rough-notation/lib/rough-notation.esm.js';

const annotation = Symbol('annotation');
const ANNOTATION_DEFAULT_OPTIONS = {
  color: 'var(--brand-color)',
  strokeWidth: '.15em',
  animationDuration: 500
};

const getAnnotation = element => {
  if (!(annotation in element)) {
    const [type, ...optionParts] = element.dataset.annotation.split(';');
    const options = optionParts.reduce(
      (options, option) => {
        const [key, value] = option.trim().split(/\s*:\s*/);
        if (key) {
          if (key === 'padding') {
            const fontSize = parseFloat(window.getComputedStyle(element).fontSize);
            options[key] = value.split(/\s*,\s*/).map(value => Number(value) * fontSize);
          } else if (value === 'true' || value === 'false') {
            options[key] = value === 'true';
          } else if (Number.isFinite(Number(value))) {
            options[key] = Number(value);
          } else if (value.includes(',')) {
            options[key] = value.split(/\s*,\s*/);
          } else {
            options[key] = value;
          }
        }
        return options;
      },
      { ...ANNOTATION_DEFAULT_OPTIONS, type }
    );
    element[annotation] = annotate(element, options);
  }
  return element[annotation];
};

const toggleAnnotation = element => {
  const { isVisible } = element.closest('p-fragment');
  const annotation = getAnnotation(element);
  annotation[isVisible ? 'show' : 'hide']();
};

const ensureSketch = element => {
  let svg = element.querySelector('svg');
  if (svg) return svg;
  svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const factor = parseFloat(window.getComputedStyle(element).fontSize) / 10;
  const rect = element.getBoundingClientRect();
  const width = rect.width / factor;
  const height = rect.height / factor;
  const viewBox = `0 0 ${width} ${height}`;
  svg.setAttribute('viewBox', viewBox);
  svg.innerHTML = `<path d="${Array.from({ length: width + height }, (_, index) => {
    const cmd = index ? 'L' : 'M';
    let x, y;
    if (index & 1) {
      x = Math.min(index, width) + Math.random() - 0.5;
      y = Math.max(0, index - width) + Math.random() - 0.5;
    } else {
      x = Math.max(0, index - height) + Math.random() - 0.5;
      y = Math.min(height, index) + Math.random() - 0.5;
    }
    return `${cmd} ${x} ${y}`;
  }).join('')}"/>`;
  svg.style.setProperty('--sketch-line-length', svg.firstElementChild.getTotalLength());
  element.appendChild(svg);
  return svg;
};

const deck = document.querySelector('p-deck');
deck.addEventListener('p-slides.fragmenttoggle', ({ detail: { fragment } }) => {
  if (fragment.hasAttribute('data-annotation')) {
    toggleAnnotation(fragment);
  } else if (fragment.classList.contains('sketch-rect')) {
    console.log(ensureSketch(fragment));
  }
});
const doom = deck.querySelector('#software');
const pseudoInput = deck.querySelector('[name="answer"]');
pseudoInput.addEventListener('keydown', ({ code, target: { textContent } }) => {
  if (code === 'Enter') {
    pseudoInput.blur();
    if ('yes'.indexOf(textContent.trim().toLowerCase()) === 0) {
      doom.src = doom.dataset.src;
    }
  }
});
deck.addEventListener('p-slides.slidechange', ({ detail: { slide, previous } }) => {
  if (slide.isPrevious) {
    slide.querySelectorAll('[data-annotation]').forEach(element => {
      const annotation = getAnnotation(element);
      const { animationDuration } = annotation;
      annotation.animationDuration = 0.001;
      annotation.show();
      annotation.animationDuration = animationDuration;
    });
    slide.querySelectorAll('.sketch-rect').forEach(ensureSketch);
  }
  if (slide.id === 'doom') {
    pseudoInput.textContent = '';
    pseudoInput.focus();
  } else if (previous.id === 'doom') {
    doom.src = '';
  }
});
