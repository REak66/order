/**
 * FlyonUI SPA Initialization Helper
 * 
 * Prevents "Cannot read properties of undefined (reading 'length')" runtime error.
 * In React / Vite SPAs, window.load may have already fired before FlyonUI's script is evaluated.
 * FlyonUI's internal resize listener checks window.$hsOverlayCollection.length without verifying
 * if the collection is defined. Pre-initializing the collections ensures safe execution.
 */

if (typeof window !== 'undefined') {
  const hsCollections = [
    '$hsOverlayCollection',
    '$hsComboBoxCollection',
    '$hsDropdownCollection',
    '$hsSelectCollection',
    '$hsCollapseCollection',
    '$hsAccordionCollection',
    '$hsTabsCollection',
    '$hsTooltipCollection',
    '$hsPinInputCollection',
    '$hsStepperCollection',
    '$hsCopyMarkupCollection',
    '$hsCarouselCollection',
    '$hsInputNumberCollection',
    '$hsRemoveElementCollection',
    '$hsScrollspyCollection',
    '$hsStrongPasswordCollection',
    '$hsToggleCountCollection',
    '$hsTogglePasswordCollection',
    '$hsTreeViewCollection',
    '$hsDataTableCollection',
    '$hsFileUploadCollection',
    '$hsRangeSliderCollection'
  ];

  hsCollections.forEach((collectionName) => {
    if (!window[collectionName]) {
      window[collectionName] = [];
    }
  });

  // Safely auto-initialize FlyonUI components if document is already ready
  const safeAutoInit = () => {
    if (window.HSStaticMethods && typeof window.HSStaticMethods.autoInit === 'function') {
      try {
        window.HSStaticMethods.autoInit();
      } catch (err) {
        console.warn('FlyonUI autoInit warning:', err);
      }
    }
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(safeAutoInit, 50);
  } else {
    window.addEventListener('DOMContentLoaded', safeAutoInit, { once: true });
  }
}
