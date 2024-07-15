export default class GenericCRUD<T> {
  private data: T[] = []

  create(item: T) {
    this.data.push(item)
  }

  read() {
    return this.data
  }

  update(item: T) {
    const index = this.data.findIndex(d => d === item)
    this.data[index] = item
  }

  delete(item: T) {
    this.data = this.data.filter(d => d !== item)
  }
}