// Helper compartido por los DTO: distingue un sub-documento ya resuelto por
// `.populate()` (tiene su propio _id, más los campos del select) de un
// ObjectId/string sin resolver. Así los DTO pueden filtrar el documento
// relacionado SOLO cuando realmente vino poblado, y dejar el id tal cual
// cuando no.
export function isPopulatedDoc(value) {
  return Boolean(value) && typeof value === 'object' && value._id !== undefined;
}

export default { isPopulatedDoc };
