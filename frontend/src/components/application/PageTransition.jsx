import React from 'react';

const PageTransition = ({ children }) => {
  return (
    <div className="w-full motion-preset-fade motion-duration-3000">
      {children}
    </div>
  );
};

export default PageTransition;
