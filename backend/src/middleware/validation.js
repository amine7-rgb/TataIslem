export const validateReservationInput = (data) => {
  const errors = [];

  if (!data.eventId) {
    errors.push('Missing eventId');
  }

  if (!data.gender || !['male', 'female'].includes(String(data.gender))) {
    errors.push('Invalid gender');
  }

  return errors;
};

export const validateServiceInput = (data) => {
  const errors = [];

  if (!data.serviceId) {
    errors.push('Missing serviceId');
  }

  if (!data.requestedStartAt) {
    errors.push('Missing requestedStartAt');
  }

  return errors;
};
