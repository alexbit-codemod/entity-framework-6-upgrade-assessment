using System.Data.Entity;

namespace Sample
{
    public class StoreContext
    {
        private readonly IDbSet<Product> _products;

        public StoreContext(IDbSet<Product> products)
        {
            _products = products;
        }

        public IDbSet<Product> Products => _products;
    }

    public class Product { }
}
