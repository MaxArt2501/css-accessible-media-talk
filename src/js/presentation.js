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
          if (value === 'true' || value === 'false') {
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

const deck = document.querySelector('p-deck');
deck.addEventListener('p-slides.fragmenttoggle', ({ detail: { fragment } }) => {
  if (fragment.hasAttribute('data-annotation')) {
    toggleAnnotation(fragment);
  } else {
    fragment.querySelectorAll('[data-annotation]').forEach(toggleAnnotation);
  }
});
