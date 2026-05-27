const errorHandler = (err, req, res, next) => {
    console.error('Error occurred in request:', err);

    const status = err.status || 500;
    const message = err.message || 'Server error';

    res.status(status).json({
        message,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

module.exports = errorHandler;
