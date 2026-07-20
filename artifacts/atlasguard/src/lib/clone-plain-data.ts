const isPlainObject = (value: object) => {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export const clonePlainData = <Value>(value: Value): Value => {
  if (Array.isArray(value)) {
    return value.map((item) => clonePlainData(item)) as Value;
  }

  if (value !== null && typeof value === "object") {
    if (!isPlainObject(value)) {
      throw new TypeError("MoveWise can clone only plain data values.");
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clonePlainData(item)]),
    ) as Value;
  }

  return value;
};
